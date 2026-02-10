import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme';
import { useAgentStore, useAgents } from '../store/useAgentStore';
import { getEnhancedTransactions, mapHeliusType } from '../services/helius';
import TransactionItem from '../components/TransactionItem';
import type { AgentTransaction } from '../types';

const DEMO_TRANSACTIONS: AgentTransaction[] = [
  {
    id: 'demo_tx_1',
    agentId: 'demo_agent_1',
    signature: '5xYz...demo1',
    type: 'swap',
    description: 'Swapped 2.5 SOL for 450 USDC on Jupiter',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    status: 'success',
    fee: 0.000005,
    from: 'DemoWa11etAddr3ss1111111111111111111111111111',
    to: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
    solAmount: 2.5,
    tokenAmount: 450,
    tokenSymbol: 'USDC',
  },
  {
    id: 'demo_tx_2',
    agentId: 'demo_agent_2',
    signature: '8aBc...demo2',
    type: 'transfer',
    description: 'Transferred 0.5 SOL to vault',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'success',
    fee: 0.000005,
    from: 'DemoWa11etAddr3ss2222222222222222222222222222',
    to: 'VaultAddr3ss999999999999999999999999999999999',
    solAmount: 0.5,
  },
  {
    id: 'demo_tx_3',
    agentId: 'demo_agent_1',
    signature: '3dEf...demo3',
    type: 'program_interaction',
    description: 'Deposited 1000 USDC into Marinade Finance',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: 'success',
    fee: 0.000005,
    from: 'DemoWa11etAddr3ss1111111111111111111111111111',
    to: 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',
    tokenAmount: 1000,
    tokenSymbol: 'USDC',
  },
  {
    id: 'demo_tx_4',
    agentId: 'demo_agent_3',
    signature: '7gHi...demo4',
    type: 'stake',
    description: 'Staked 10 SOL via Marinade',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'success',
    fee: 0.000005,
    from: 'DemoWa11etAddr3ss3333333333333333333333333333',
    to: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
    solAmount: 10,
  },
  {
    id: 'demo_tx_5',
    agentId: 'demo_agent_1',
    signature: '2jKl...demo5',
    type: 'swap',
    description: 'Swapped 500 USDC for 2.8 SOL on Raydium',
    timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    status: 'failed',
    fee: 0.000005,
    from: 'DemoWa11etAddr3ss1111111111111111111111111111',
    to: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    solAmount: 2.8,
    tokenAmount: 500,
    tokenSymbol: 'USDC',
  },
];

export default function TransactionFeedScreen() {
  const agents = useAgents();
  const { transactions: txStore, setTransactions } = useAgentStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');

  // Combine all agent transactions into one feed
  const allTransactions: AgentTransaction[] = React.useMemo(() => {
    const allTxs = Object.values(txStore).flat();
    if (allTxs.length === 0) {
      return DEMO_TRANSACTIONS;
    }
    return allTxs.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [txStore]);

  const filteredTransactions = React.useMemo(() => {
    if (filter === 'all') return allTransactions;
    return allTransactions.filter((tx) => tx.status === filter);
  }, [allTransactions, filter]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled(
        agents.map(async (agent) => {
          if (agent.walletAddress.startsWith('Demo')) return;
          try {
            const enhancedTxs = await getEnhancedTransactions(agent.walletAddress, 20);
            const mapped: AgentTransaction[] = enhancedTxs.map((tx) => ({
              id: tx.signature,
              agentId: agent.id,
              signature: tx.signature,
              type: mapHeliusType(tx.type) as AgentTransaction['type'],
              description: tx.description || `${tx.type} transaction`,
              timestamp: new Date(tx.timestamp * 1000).toISOString(),
              status: 'success' as const,
              fee: tx.fee / 1e9,
              from: tx.feePayer,
              to: tx.nativeTransfers?.[0]?.toUserAccount || '',
              solAmount: (tx.nativeTransfers?.[0]?.amount || 0) / 1e9,
              tokenAmount: tx.tokenTransfers?.[0]?.tokenAmount,
              tokenSymbol: tx.tokenTransfers?.[0]?.mint ? 'SPL' : undefined,
            }));
            setTransactions(agent.id, mapped);
          } catch {
            // Keep existing data
          }
        })
      );
    } finally {
      setRefreshing(false);
    }
  }, [agents, setTransactions]);

  const agentNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    agents.forEach((a) => map.set(a.id, a.name));
    // Add demo names
    map.set('demo_agent_1', 'Trading Bot Alpha');
    map.set('demo_agent_2', 'Security Monitor');
    map.set('demo_agent_3', 'Yield Farmer');
    return map;
  }, [agents]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Transaction Feed</Text>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'success', 'failed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === f && styles.filterTabTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.txRow}>
            <Text style={styles.agentLabel}>
              {agentNameMap.get(item.agentId) || 'Unknown Agent'}
            </Text>
            <TransactionItem transaction={item} />
          </View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No transactions yet</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusRound,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  filterTabActive: {
    backgroundColor: colors.primary15,
    borderColor: colors.primary,
  },
  filterTabText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
  txRow: {
    marginBottom: spacing.xs,
  },
  agentLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
});
