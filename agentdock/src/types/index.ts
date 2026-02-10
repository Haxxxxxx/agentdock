// ─── Agent ───────────────────────────────────────────────────
export type AgentStatus = 'active' | 'paused' | 'offline';

export interface Agent {
  id: string;
  name: string;
  walletAddress: string;
  description: string;
  status: AgentStatus;
  apiKeyHash: string;
  createdAt: string;
  lastSeenAt: string;
  ownerId: string;
  // Live-fetched (not persisted)
  solBalance?: number;
  usdcBalance?: number;
}

// ─── Transactions ────────────────────────────────────────────
export type TransactionType = 'transfer' | 'swap' | 'stake' | 'program_interaction' | 'unknown';
export type TransactionStatus = 'success' | 'failed';

export interface AgentTransaction {
  id: string;
  agentId: string;
  signature: string;
  type: TransactionType;
  description: string;
  timestamp: string;
  status: TransactionStatus;
  fee: number;
  // Amounts
  solAmount?: number;
  tokenAmount?: number;
  tokenSymbol?: string;
  // Addresses
  from: string;
  to: string;
  programId?: string;
}

// ─── Approvals ───────────────────────────────────────────────
export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired';

export interface ApprovalRequest {
  id: string;
  agentId: string;
  agentName: string;
  description: string;
  status: ApprovalStatus;
  createdAt: string;
  expiresAt: string;
  respondedAt?: string;
  // Transaction details
  txType: TransactionType;
  estimatedSolCost: number;
  targetProgram?: string;
  targetAddress?: string;
  amount?: number;
  tokenSymbol?: string;
}

// ─── Policies ────────────────────────────────────────────────
export interface SpendingPolicy {
  id: string;
  agentId: string;
  dailyLimitSol: number;
  perTxLimitSol: number;
  allowlistedPrograms: string[];
  requireApprovalAbove: number; // SOL threshold
  isActive: boolean;
  updatedAt: string;
}

// ─── User ────────────────────────────────────────────────────
export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  agentIds: string[];
  notificationsEnabled: boolean;
  fcmToken?: string;
}

// ─── Analytics ───────────────────────────────────────────────
export interface DailySpending {
  date: string;
  totalSol: number;
  txCount: number;
  successRate: number;
}

export interface AgentAnalytics {
  agentId: string;
  dailySpending: DailySpending[];
  totalSpentSol: number;
  totalTxCount: number;
  avgSuccessRate: number;
}

// ─── Navigation ──────────────────────────────────────────────
export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  AgentDetail: { agentId: string };
  Approval: { approvalId: string };
};

export type TabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Approvals: undefined;
  Settings: undefined;
};
