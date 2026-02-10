import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import * as crypto from "crypto";
import express from "express";
import cors from "cors";
import { evaluateTransaction } from "./policyEngine";

// ─── Types ──────────────────────────────────────────────────

interface RegisterBody {
  name: string;
  walletAddress: string;
  description?: string;
  ownerId: string;
}

interface ApprovalRequestBody {
  description: string;
  txType: "transfer" | "swap" | "stake" | "program_interaction" | "unknown";
  estimatedSolCost: number;
  targetProgram?: string;
  targetAddress?: string;
  amount?: number;
  tokenSymbol?: string;
  expiresInMinutes?: number;
}

// ─── Firestore + Helpers ────────────────────────────────────

function getDb() {
  return admin.firestore();
}

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function generateApiKey(): string {
  return crypto.randomBytes(32).toString("hex");
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
    if (
      error.code === "messaging/registration-token-not-registered" ||
      error.code === "messaging/invalid-registration-token"
    ) {
      await getDb().collection("users").doc(ownerId).update({
        fcmToken: admin.firestore.FieldValue.delete(),
      });
    }
    functions.logger.error("FCM send failed", { ownerId, error: err });
  }
}

// ─── Auth Middleware ─────────────────────────────────────────

/**
 * Validates Bearer token against hashed apiKey in the agents collection.
 * Attaches `agentId` and `agent` data to `res.locals` on success.
 */
async function authenticateAgent(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const apiKey = authHeader.slice(7); // strip "Bearer "
  if (!apiKey) {
    res.status(401).json({ error: "Empty API key" });
    return;
  }

  const keyHash = hashApiKey(apiKey);

  const snap = await getDb()
    .collection("agents")
    .where("apiKeyHash", "==", keyHash)
    .limit(1)
    .get();

  if (snap.empty) {
    res.status(403).json({ error: "Invalid API key" });
    return;
  }

  const agentDoc = snap.docs[0];
  res.locals.agentId = agentDoc.id;
  res.locals.agent = { id: agentDoc.id, ...agentDoc.data() };

  next();
}

// ─── Express App ────────────────────────────────────────────

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ─── POST /api/agents/register ──────────────────────────────

app.post("/api/agents/register", async (req, res) => {
  try {
    const body = req.body as RegisterBody;

    // Validate required fields
    if (!body.name || !body.walletAddress || !body.ownerId) {
      res.status(400).json({
        error: "Missing required fields: name, walletAddress, ownerId",
      });
      return;
    }

    // Validate wallet address format (Solana base58, 32-44 chars)
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(body.walletAddress)) {
      res.status(400).json({ error: "Invalid Solana wallet address format" });
      return;
    }

    // Verify owner exists
    const ownerDoc = await getDb().collection("users").doc(body.ownerId).get();
    if (!ownerDoc.exists) {
      res.status(404).json({ error: "Owner user not found" });
      return;
    }

    // Generate API key
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    const now = new Date().toISOString();
    const agentRef = getDb().collection("agents").doc();

    const agentData = {
      id: agentRef.id,
      name: body.name,
      walletAddress: body.walletAddress,
      description: body.description ?? "",
      status: "active" as const,
      apiKeyHash,
      createdAt: now,
      lastSeenAt: now,
      ownerId: body.ownerId,
    };

    // Create agent + default policy + update owner's agentIds atomically
    const policyRef = getDb().collection("policies").doc();
    const defaultPolicy = {
      id: policyRef.id,
      agentId: agentRef.id,
      dailyLimitSol: 1.0,
      perTxLimitSol: 0.5,
      allowlistedPrograms: [],
      requireApprovalAbove: 0.1,
      isActive: true,
      updatedAt: now,
    };

    const batch = getDb().batch();
    batch.set(agentRef, agentData);
    batch.set(policyRef, defaultPolicy);
    batch.update(getDb().collection("users").doc(body.ownerId), {
      agentIds: admin.firestore.FieldValue.arrayUnion(agentRef.id),
    });
    await batch.commit();

    functions.logger.info("Agent registered", { agentId: agentRef.id });

    // Return the plain-text API key (only time it's ever visible)
    res.status(201).json({
      agentId: agentRef.id,
      apiKey,
      message:
        "Store this API key securely. It will not be shown again.",
    });
  } catch (err) {
    functions.logger.error("Error registering agent", { error: err });
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/approvals/request ────────────────────────────

app.post(
  "/api/approvals/request",
  authenticateAgent,
  async (req, res) => {
    try {
      const body = req.body as ApprovalRequestBody;
      const agent = res.locals.agent as {
        id: string;
        name: string;
        ownerId: string;
      };

      // Validate required fields
      if (!body.description || !body.txType || body.estimatedSolCost === undefined) {
        res.status(400).json({
          error: "Missing required fields: description, txType, estimatedSolCost",
        });
        return;
      }

      if (body.estimatedSolCost < 0) {
        res.status(400).json({ error: "estimatedSolCost must be non-negative" });
        return;
      }

      // Run policy engine to check if auto-approval is possible
      const evaluation = await evaluateTransaction(
        agent.id,
        body.estimatedSolCost,
        body.targetProgram
      );

      const now = new Date();
      const expiresInMs = (body.expiresInMinutes ?? 15) * 60 * 1000;
      const expiresAt = new Date(now.getTime() + expiresInMs);

      const approvalRef = getDb().collection("approvals").doc();
      const approvalData = {
        id: approvalRef.id,
        agentId: agent.id,
        agentName: agent.name,
        description: body.description,
        status: evaluation.autoApproved ? "approved" : "pending",
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        ...(evaluation.autoApproved && { respondedAt: now.toISOString() }),
        txType: body.txType,
        estimatedSolCost: body.estimatedSolCost,
        ...(body.targetProgram && { targetProgram: body.targetProgram }),
        ...(body.targetAddress && { targetAddress: body.targetAddress }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.tokenSymbol && { tokenSymbol: body.tokenSymbol }),
        policyEvaluation: evaluation.reason,
      };

      await approvalRef.set(approvalData);

      // If not auto-approved, notify the owner for manual review
      if (!evaluation.autoApproved) {
        await sendPushToOwner(
          agent.ownerId,
          `Approval Required: ${agent.name}`,
          `${body.description} (${body.estimatedSolCost} SOL)`,
          {
            approvalId: approvalRef.id,
            agentId: agent.id,
            type: "approval_request",
          }
        );
      }

      functions.logger.info("Approval request created", {
        approvalId: approvalRef.id,
        autoApproved: evaluation.autoApproved,
      });

      res.status(201).json({
        approvalId: approvalRef.id,
        status: approvalData.status,
        autoApproved: evaluation.autoApproved,
        reason: evaluation.reason,
      });
    } catch (err) {
      functions.logger.error("Error creating approval request", { error: err });
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/approvals/:id/status ──────────────────────────

app.get(
  "/api/approvals/:id/status",
  authenticateAgent,
  async (req, res) => {
    try {
      const approvalId = req.params.id;
      const agentId = res.locals.agentId as string;

      const doc = await getDb().collection("approvals").doc(approvalId).get();
      if (!doc.exists) {
        res.status(404).json({ error: "Approval request not found" });
        return;
      }

      const data = doc.data()!;

      // Verify the approval belongs to this agent
      if (data.agentId !== agentId) {
        res.status(403).json({ error: "Not authorized to view this approval" });
        return;
      }

      // Check if pending approval has expired
      if (data.status === "pending" && new Date(data.expiresAt) < new Date()) {
        await doc.ref.update({ status: "expired" });
        res.status(200).json({
          approvalId: doc.id,
          status: "expired",
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
        });
        return;
      }

      res.status(200).json({
        approvalId: doc.id,
        status: data.status,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        respondedAt: data.respondedAt ?? null,
      });
    } catch (err) {
      functions.logger.error("Error fetching approval status", { error: err });
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── GET /api/policies/:agentId ─────────────────────────────

app.get(
  "/api/policies/:agentId",
  authenticateAgent,
  async (req, res) => {
    try {
      const requestedAgentId = req.params.agentId;
      const callerAgentId = res.locals.agentId as string;

      // Agents can only read their own policy
      if (requestedAgentId !== callerAgentId) {
        res.status(403).json({ error: "Not authorized to view this policy" });
        return;
      }

      const snap = await getDb()
        .collection("policies")
        .where("agentId", "==", requestedAgentId)
        .where("isActive", "==", true)
        .limit(1)
        .get();

      if (snap.empty) {
        res.status(404).json({ error: "No active policy found for this agent" });
        return;
      }

      const policy = { id: snap.docs[0].id, ...snap.docs[0].data() };

      // Strip internal fields if needed
      res.status(200).json(policy);
    } catch (err) {
      functions.logger.error("Error fetching policy", { error: err });
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export { app as approvalApp };
