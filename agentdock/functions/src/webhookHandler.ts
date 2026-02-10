import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import * as functions from "firebase-functions";

// ─── Helius Webhook Types ───────────────────────────────────

interface HeliusTokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount: string;
  toTokenAccount: string;
  tokenAmount: number;
  mint: string;
  tokenStandard: string;
}

interface HeliusNativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number; // in lamports
}

interface HeliusEnhancedTransaction {
  signature: string;
  description: string;
  type: string; // e.g. "TRANSFER", "SWAP", "UNKNOWN"
  source: string;
  fee: number; // in lamports
  feePayer: string;
  timestamp: number; // unix seconds
  nativeTransfers: HeliusNativeTransfer[];
  tokenTransfers: HeliusTokenTransfer[];
  accountData: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
      userAccount: string;
      tokenAccount: string;
      mint: string;
      rawTokenAmount: { tokenAmount: string; decimals: number };
    }>;
  }>;
  events: Record<string, unknown>;
  transactionError: string | null;
}

// ─── Type Mapping ───────────────────────────────────────────

type TransactionType =
  | "transfer"
  | "swap"
  | "stake"
  | "program_interaction"
  | "unknown";

function mapHeliusType(heliusType: string): TransactionType {
  const normalized = heliusType.toUpperCase();
  switch (normalized) {
    case "TRANSFER":
    case "TOKEN_TRANSFER":
      return "transfer";
    case "SWAP":
      return "swap";
    case "STAKE_SOL":
    case "STAKE_TOKEN":
      return "stake";
    case "UNKNOWN":
      return "unknown";
    default:
      return "program_interaction";
  }
}

// ─── Firestore Refs ─────────────────────────────────────────

function getDb() {
  return admin.firestore();
}

// ─── FCM Notification Helper ────────────────────────────────

async function sendPushToOwner(
  ownerId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const userDoc = await getDb().collection("users").doc(ownerId).get();
  if (!userDoc.exists) return;

  const user = userDoc.data();
  if (!user?.fcmToken || !user?.notificationsEnabled) return;

  try {
    await admin.messaging().send({
      token: user.fcmToken,
      notification: { title, body },
      data: data ?? {},
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default", badge: 1 } } },
    });
  } catch (err: unknown) {
    const error = err as { code?: string };
    // Token may be stale -- remove it so we stop retrying
    if (
      error.code === "messaging/registration-token-not-registered" ||
      error.code === "messaging/invalid-registration-token"
    ) {
      await getDb().collection("users").doc(ownerId).update({ fcmToken: admin.firestore.FieldValue.delete() });
    }
    functions.logger.error("FCM send failed", { ownerId, error: err });
  }
}

// ─── Webhook Handler ────────────────────────────────────────

export const onHeliusWebhook = onRequest(
  { cors: false, maxInstances: 10 },
  async (req, res) => {
    // Only accept POST
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const payload = req.body;

    // Helius sends an array of EnhancedTransaction objects
    if (!Array.isArray(payload)) {
      res.status(400).json({ error: "Expected array of transactions" });
      return;
    }

    const transactions: HeliusEnhancedTransaction[] = payload;
    functions.logger.info(`Received ${transactions.length} transactions from Helius`);

    const batch = getDb().batch();
    const agentNotifications: Map<
      string,
      { agentName: string; ownerId: string; txCount: number }
    > = new Map();

    for (const tx of transactions) {
      try {
        // Determine the primary "from" and "to" addresses
        const from = tx.feePayer;
        let to = "";
        let solAmount = 0;
        let tokenAmount: number | undefined;
        let tokenSymbol: string | undefined;

        // Parse native transfers
        if (tx.nativeTransfers.length > 0) {
          const primaryTransfer = tx.nativeTransfers[0];
          to = primaryTransfer.toUserAccount;
          solAmount = primaryTransfer.amount / 1e9; // lamports -> SOL
        }

        // Parse token transfers
        if (tx.tokenTransfers.length > 0) {
          const primaryTokenTx = tx.tokenTransfers[0];
          to = to || primaryTokenTx.toUserAccount;
          tokenAmount = primaryTokenTx.tokenAmount;
          tokenSymbol = primaryTokenTx.mint; // mint address as symbol fallback
        }

        // Build the transaction document
        const txDoc: Record<string, unknown> = {
          signature: tx.signature,
          type: mapHeliusType(tx.type),
          description: tx.description || `${tx.type} transaction`,
          timestamp: new Date(tx.timestamp * 1000).toISOString(),
          status: tx.transactionError ? "failed" : "success",
          fee: tx.fee / 1e9, // lamports -> SOL
          from,
          to,
          solAmount,
          ...(tokenAmount !== undefined && { tokenAmount }),
          ...(tokenSymbol && { tokenSymbol }),
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Match transaction to an agent by wallet address (from or to)
        const agentSnap = await getDb()
          .collection("agents")
          .where("walletAddress", "in", [from, to])
          .limit(1)
          .get();

        let agentId: string | null = null;

        if (!agentSnap.empty) {
          const agentDoc = agentSnap.docs[0];
          agentId = agentDoc.id;
          txDoc.agentId = agentId;

          const agentData = agentDoc.data();

          // Update agent lastSeenAt
          batch.update(agentDoc.ref, {
            lastSeenAt: new Date().toISOString(),
          });

          // Accumulate notification info
          const existing = agentNotifications.get(agentId);
          if (existing) {
            existing.txCount += 1;
          } else {
            agentNotifications.set(agentId, {
              agentName: agentData.name ?? "Unknown Agent",
              ownerId: agentData.ownerId,
              txCount: 1,
            });
          }
        }

        // Store the transaction
        const txRef = getDb().collection("transactions").doc();
        txDoc.id = txRef.id;
        batch.set(txRef, txDoc);
      } catch (err) {
        functions.logger.error("Error processing transaction", {
          signature: tx.signature,
          error: err,
        });
      }
    }

    // Commit all writes
    await batch.commit();

    // Send FCM notifications (outside batch -- non-critical)
    const notificationPromises: Promise<void>[] = [];
    for (const [agentId, info] of agentNotifications) {
      const title = `${info.agentName} Activity`;
      const body =
        info.txCount === 1
          ? "New transaction detected"
          : `${info.txCount} new transactions detected`;

      notificationPromises.push(
        sendPushToOwner(info.ownerId, title, body, { agentId })
      );
    }
    await Promise.allSettled(notificationPromises);

    res.status(200).json({
      success: true,
      processed: transactions.length,
    });
  }
);
