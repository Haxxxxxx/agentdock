import * as admin from "firebase-admin";

// ─── Types ──────────────────────────────────────────────────

interface SpendingPolicy {
  id: string;
  agentId: string;
  dailyLimitSol: number;
  perTxLimitSol: number;
  allowlistedPrograms: string[];
  requireApprovalAbove: number;
  isActive: boolean;
  updatedAt: string;
}

interface PolicyEvaluation {
  autoApproved: boolean;
  reason: string;
}

// ─── Policy Engine ──────────────────────────────────────────

function getDb() {
  return admin.firestore();
}

/**
 * Load the spending policy for a given agent.
 * Returns null if no active policy exists.
 */
async function loadPolicy(agentId: string): Promise<SpendingPolicy | null> {
  const snap = await getDb()
    .collection("policies")
    .where("agentId", "==", agentId)
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (snap.empty) {
    return null;
  }

  return { id: snap.docs[0].id, ...snap.docs[0].data() } as SpendingPolicy;
}

/**
 * Get the total SOL spent by an agent today (UTC).
 */
async function getDailySpending(agentId: string): Promise<number> {
  const now = new Date();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const snap = await getDb()
    .collection("transactions")
    .where("agentId", "==", agentId)
    .where("status", "==", "success")
    .where("timestamp", ">=", startOfDay.toISOString())
    .get();

  let total = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    // Sum SOL amounts + fees
    total += (data.solAmount ?? 0) + (data.fee ?? 0);
  }

  return total;
}

/**
 * Evaluate whether a transaction should be auto-approved or requires human approval.
 *
 * Checks in order:
 * 1. No active policy -> require approval (fail-safe)
 * 2. Per-transaction limit
 * 3. Daily aggregate limit
 * 4. Program allowlist (if programId provided)
 * 5. Threshold-based approval requirement
 */
export async function evaluateTransaction(
  agentId: string,
  txAmount: number,
  programId?: string
): Promise<PolicyEvaluation> {
  const policy = await loadPolicy(agentId);

  // No policy = always require human approval (fail-safe)
  if (!policy) {
    return {
      autoApproved: false,
      reason: "No active spending policy found. Human approval required.",
    };
  }

  // Check 1: Per-transaction limit
  if (txAmount > policy.perTxLimitSol) {
    return {
      autoApproved: false,
      reason: `Transaction amount ${txAmount} SOL exceeds per-tx limit of ${policy.perTxLimitSol} SOL.`,
    };
  }

  // Check 2: Daily aggregate limit
  const dailySpent = await getDailySpending(agentId);
  if (dailySpent + txAmount > policy.dailyLimitSol) {
    return {
      autoApproved: false,
      reason: `Daily spending would reach ${(dailySpent + txAmount).toFixed(4)} SOL, exceeding daily limit of ${policy.dailyLimitSol} SOL.`,
    };
  }

  // Check 3: Program allowlist
  if (
    programId &&
    policy.allowlistedPrograms.length > 0 &&
    !policy.allowlistedPrograms.includes(programId)
  ) {
    return {
      autoApproved: false,
      reason: `Program ${programId} is not in the allowlisted programs.`,
    };
  }

  // Check 4: Threshold-based approval
  if (txAmount > policy.requireApprovalAbove) {
    return {
      autoApproved: false,
      reason: `Transaction amount ${txAmount} SOL exceeds approval threshold of ${policy.requireApprovalAbove} SOL.`,
    };
  }

  // All checks passed
  return {
    autoApproved: true,
    reason: "Transaction within policy limits. Auto-approved.",
  };
}
