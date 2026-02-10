import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Agent,
  AgentTransaction,
  ApprovalRequest,
  SpendingPolicy,
  AppUser,
} from '../types';

interface AgentStoreState {
  // User
  user: AppUser | null;
  isAuthenticated: boolean;

  // Agents
  agents: Agent[];
  selectedAgentId: string | null;

  // Transactions
  transactions: Record<string, AgentTransaction[]>; // keyed by agentId

  // Approvals
  pendingApprovals: ApprovalRequest[];

  // Policies
  policies: Record<string, SpendingPolicy>; // keyed by agentId

  // UI
  isLoading: boolean;
  error: string | null;
}

interface AgentStoreActions {
  // User
  setUser: (user: AppUser | null) => void;
  setAuthenticated: (auth: boolean) => void;

  // Agents
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (agentId: string, updates: Partial<Agent>) => void;
  removeAgent: (agentId: string) => void;
  selectAgent: (agentId: string | null) => void;

  // Transactions
  setTransactions: (agentId: string, txs: AgentTransaction[]) => void;
  addTransaction: (agentId: string, tx: AgentTransaction) => void;

  // Approvals
  setPendingApprovals: (approvals: ApprovalRequest[]) => void;
  updateApproval: (approvalId: string, status: ApprovalRequest['status']) => void;

  // Policies
  setPolicy: (agentId: string, policy: SpendingPolicy) => void;

  // UI
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Reset
  reset: () => void;
}

const initialState: AgentStoreState = {
  user: null,
  isAuthenticated: false,
  agents: [],
  selectedAgentId: null,
  transactions: {},
  pendingApprovals: [],
  policies: {},
  isLoading: false,
  error: null,
};

export const useAgentStore = create<AgentStoreState & AgentStoreActions>()(
  persist(
    (set) => ({
      ...initialState,

      // User
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

      // Agents
      setAgents: (agents) => set({ agents }),
      addAgent: (agent) =>
        set((state) => ({ agents: [...state.agents, agent] })),
      updateAgent: (agentId, updates) =>
        set((state) => ({
          agents: state.agents.map((a) =>
            a.id === agentId ? { ...a, ...updates } : a
          ),
        })),
      removeAgent: (agentId) =>
        set((state) => ({
          agents: state.agents.filter((a) => a.id !== agentId),
          selectedAgentId:
            state.selectedAgentId === agentId ? null : state.selectedAgentId,
        })),
      selectAgent: (agentId) => set({ selectedAgentId: agentId }),

      // Transactions
      setTransactions: (agentId, txs) =>
        set((state) => ({
          transactions: { ...state.transactions, [agentId]: txs },
        })),
      addTransaction: (agentId, tx) =>
        set((state) => ({
          transactions: {
            ...state.transactions,
            [agentId]: [tx, ...(state.transactions[agentId] || [])],
          },
        })),

      // Approvals
      setPendingApprovals: (pendingApprovals) => set({ pendingApprovals }),
      updateApproval: (approvalId, status) =>
        set((state) => ({
          pendingApprovals: state.pendingApprovals.map((a) =>
            a.id === approvalId
              ? { ...a, status, respondedAt: new Date().toISOString() }
              : a
          ),
        })),

      // Policies
      setPolicy: (agentId, policy) =>
        set((state) => ({
          policies: { ...state.policies, [agentId]: policy },
        })),

      // UI
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'agentdock-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        agents: state.agents,
        selectedAgentId: state.selectedAgentId,
        policies: state.policies,
      }),
    }
  )
);

// ─── Selectors ───────────────────────────────────────────────
export const useUser = () => useAgentStore((s) => s.user);
export const useIsAuthenticated = () => useAgentStore((s) => s.isAuthenticated);
export const useAgents = () => useAgentStore((s) => s.agents);
export const useSelectedAgent = () =>
  useAgentStore((s) => s.agents.find((a) => a.id === s.selectedAgentId) ?? null);
export const usePendingApprovals = () => useAgentStore((s) => s.pendingApprovals);
export const useAgentTransactions = (agentId: string) =>
  useAgentStore((s) => s.transactions[agentId] || []);
export const useAgentPolicy = (agentId: string) =>
  useAgentStore((s) => s.policies[agentId] ?? null);
export const usePendingApprovalCount = () =>
  useAgentStore((s) => s.pendingApprovals.filter((a) => a.status === 'pending').length);
