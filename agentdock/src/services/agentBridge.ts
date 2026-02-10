/**
 * Agent Bridge — REST API client for agent ↔ app communication.
 * In production, agents call the Cloud Functions directly.
 * This module is used by the mobile app to manage agents and test the API.
 */

const BASE_URL = process.env.EXPO_PUBLIC_AGENT_BRIDGE_URL || 'http://localhost:5001';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiCall<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || `HTTP ${response.status}` };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ─── Agent Registration ──────────────────────────────────────
export async function registerAgent(params: {
  name: string;
  walletAddress: string;
  description: string;
  ownerId: string;
}) {
  return apiCall<{ agentId: string; apiKey: string }>('/api/agents/register', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ─── Approval Requests ───────────────────────────────────────
export async function requestApproval(params: {
  agentId: string;
  apiKey: string;
  description: string;
  txType: string;
  estimatedSolCost: number;
  targetProgram?: string;
  targetAddress?: string;
  amount?: number;
  tokenSymbol?: string;
}) {
  const { apiKey, ...body } = params;
  return apiCall<{ approvalId: string }>('/api/approvals/request', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
}

export async function getApprovalStatus(approvalId: string, apiKey: string) {
  return apiCall<{ status: string; respondedAt?: string }>(
    `/api/approvals/${approvalId}/status`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );
}

// ─── Policy Fetch ────────────────────────────────────────────
export async function getAgentPolicy(agentId: string, apiKey: string) {
  return apiCall<{
    dailyLimitSol: number;
    perTxLimitSol: number;
    allowlistedPrograms: string[];
    requireApprovalAbove: number;
  }>(`/api/policies/${agentId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}
