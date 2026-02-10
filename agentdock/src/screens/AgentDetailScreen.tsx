import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import { colors, spacing, typography } from '../theme';
import { useAgentStore, useAgentTransactions, useAgentPolicy } from '../store/useAgentStore';
import { getSolBalance, getUsdcBalance, shortenAddress } from '../services/solana';
import { getEnhancedTransactions, mapHeliusType } from '../services/helius';
import TransactionItem from '../components/TransactionItem';
import SpendingChart from '../components/SpendingChart';
import type { RootStackParamList, AgentTransaction, DailySpending } from '../types';

type AgentDetailRoute = RouteProp<RootStackParamList, 'AgentDetail'>;

export default function AgentDetailScreen() {
  const route = useRoute<AgentDetailRoute>();
  const navigation = useNavigation();
  const { agentId } = route.params;

  const agent = useAgentStore((s) => s.agents.find((a) => a.id === agentId));
  const transactions = useAgentTransactions(agentId);
  const policy = useAgentPolicy(agentId);
  const { updateAgent, setTransactions } = useAgentStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!agent) return;
    setRefreshing(true);

    try {
      // Skip balance fetch for demo wallets
      if (!agent.walletAddress.startsWith('Demo')) {
        const [solBalance, usdcBalance] = await Promise.all([
          getSolBalance(agent.walletAddress),
          getUsdcBalance(agent.walletAddress),
        ]);
        updateAgent(agentId, { solBalance, usdcBalance });
      }

      // Fetch enhanced transactions from Helius
      if (!agent.walletAddress.startsWith('Demo')) {
        try {
          const enhancedTxs = await getEnhancedTransactions(agent.walletAddress, 30);
          const mapped: AgentTransaction[] = enhancedTxs.map((tx) => ({
            id: tx.signature,
            agentId,
            signature: tx.signature,
            type: mapHeliusType(tx.type) as AgentTransaction['type'],
            description: tx.description || `${tx.type} transaction`,
            timestamp: new Date(tx.timestamp * 1000).toISOString(),
            status: 'success',
            fee: tx.fee / 1e9,
            from: tx.feePayer,
            to: tx.nativeTransfers?.[0]?.toUserAccount || '',
            solAmount: (tx.nativeTransfers?.[0]?.amount || 0) / 1e9,
            tokenAmount: tx.tokenTransfers?.[0]?.tokenAmount,
            tokenSymbol: tx.tokenTransfers?.[0]?.mint ? 'SPL' : undefined,
          }));
          setTransactions(agentId, mapped);
        } catch (error) {
          console.warn('Failed to fetch Helius transactions:', error);
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [agent, agentId, updateAgent, setTransactions]);

  useEffect(() => {
    loadData();
  }, []);

  // Generate mock chart data from transactions
  const chartData: DailySpending[] = React.useMemo(() => {
    if (transactions.length === 0) {
      // Demo data
      return [
        { date: '02/05', totalSol: 1.2, txCount: 5, successRate: 100 },
        { date: '02/06', totalSol: 2.5, txCount: 8, successRate: 87 },
        { date: '02/07', totalSol: 0.8, txCount: 3, successRate: 100 },
        { date: '02/08', totalSol: 3.1, txCount: 12, successRate: 92 },
        { date: '02/09', totalSol: 1.9, txCount: 7, successRate: 100 },
        { date: '02/10', totalSol: 2.2, txCount: 9, successRate: 89 },
      ];
    }
    // Group real txs by day
    const byDay = new Map<string, { total: number; count: number; success: number }>();
    for (const tx of transactions) {
      const day = tx.timestamp.slice(5, 10).replace('-', '/');
      const entry = byDay.get(day) || { total: 0, count: 0, success: 0 };
      entry.total += tx.fee + (tx.solAmount || 0);
      entry.count += 1;
      if (tx.status === 'success') entry.success += 1;
      byDay.set(day, entry);
    }
    return Array.from(byDay.entries())
      .map(([date, v]) => ({
        date,
        totalSol: Number(v.total.toFixed(4)),
        txCount: v.count,
        successRate: Math.round((v.success / v.count) * 100),
      }))
      .slice(-7);
  }, [transactions]);

  if (!agent) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Agent not found</Text>
      </SafeAreaView>
    );
  }

  const statusColor =
    agent.status === 'active'
      ? colors.agentActive
      : agent.status === 'paused'
        ? colors.agentPaused
        : colors.agentOffline;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadData}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>{'< Back'}</Text>
          </TouchableOpacity>
        </View>

        {/* Agent Info */}
        <View style={styles.agentHeader}>
          <View style={styles.nameRow}>
            <Text style={styles.agentName}>{agent.name}</Text>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </View>
          <Text style={styles.walletAddress}>
            {shortenAddress(agent.walletAddress, 6)}
          </Text>
        </View>

        {/* Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceValue}>
            {(agent.solBalance ?? 0).toFixed(4)} SOL
          </Text>
          <Text style={styles.balanceSecondary}>
            ${(agent.usdcBalance ?? 0).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}{' '}
            USDC
          </Text>
        </View>

        {/* Spending Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending (7d)</Text>
          <SpendingChart data={chartData} />
        </View>

        {/* Policy Summary */}
        {policy && (
          <View style={styles.policyCard}>
            <Text style={styles.sectionTitle}>Spending Policy</Text>
            <View style={styles.policyRow}>
              <Text style={styles.policyLabel}>Daily limit</Text>
              <Text style={styles.policyValue}>{policy.dailyLimitSol} SOL</Text>
            </View>
            <View style={styles.policyRow}>
              <Text style={styles.policyLabel}>Per-tx limit</Text>
              <Text style={styles.policyValue}>{policy.perTxLimitSol} SOL</Text>
            </View>
            <View style={styles.policyRow}>
              <Text style={styles.policyLabel}>Require approval above</Text>
              <Text style={styles.policyValue}>{policy.requireApprovalAbove} SOL</Text>
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>No transactions yet</Text>
          ) : (
            transactions
              .slice(0, 15)
              .map((tx) => <TransactionItem key={tx.id} transaction={tx} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
  },
  backButton: {
    ...typography.body,
    color: colors.primaryLight,
  },
  agentHeader: {
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  agentName: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  walletAddress: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusLg,
    padding: spacing.lg,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  balanceLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  balanceValue: {
    ...typography.balance,
    color: colors.textPrimary,
  },
  balanceSecondary: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  policyCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusLg,
    padding: spacing.md,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  policyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  policyLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  policyValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
