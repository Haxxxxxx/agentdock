import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { colors, spacing, typography } from '../theme';
import {
  useAgentStore,
  useAgents,
  usePendingApprovalCount,
} from '../store/useAgentStore';
import { getSolBalance, getUsdcBalance } from '../services/solana';
import AgentCard from '../components/AgentCard';
import type { Agent, RootStackParamList } from '../types';

export default function DashboardScreen() {
  const agents = useAgents();
  const pendingCount = usePendingApprovalCount();
  const { updateAgent, setLoading, isLoading } = useAgentStore();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const refreshBalances = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.allSettled(
        agents.map(async (agent) => {
          // Skip demo wallet addresses
          if (agent.walletAddress.startsWith('Demo')) {
            return;
          }
          try {
            const [solBalance, usdcBalance] = await Promise.all([
              getSolBalance(agent.walletAddress),
              getUsdcBalance(agent.walletAddress),
            ]);
            updateAgent(agent.id, { solBalance, usdcBalance });
          } catch (error) {
            console.warn(`Failed to fetch balance for ${agent.name}:`, error);
          }
        })
      );
    } finally {
      setLoading(false);
    }
  }, [agents, updateAgent, setLoading]);

  useEffect(() => {
    if (agents.length > 0) {
      refreshBalances();
    }
  }, [agents.length]);

  const totalSol = agents.reduce((sum, a) => sum + (a.solBalance ?? 0), 0);
  const totalUsdc = agents.reduce((sum, a) => sum + (a.usdcBalance ?? 0), 0);
  const activeCount = agents.filter((a) => a.status === 'active').length;

  const renderAgent = ({ item }: { item: Agent }) => (
    <AgentCard
      agent={item}
      onPress={() => navigation.navigate('AgentDetail', { agentId: item.id })}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>AgentDock</Text>
        {pendingCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Balance</Text>
          <Text style={styles.summaryValue}>{totalSol.toFixed(2)} SOL</Text>
          <Text style={styles.summarySecondary}>
            ${totalUsdc.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Agents</Text>
          <Text style={styles.summaryValue}>{agents.length}</Text>
          <Text style={styles.summarySecondary}>
            {activeCount} active
          </Text>
        </View>
      </View>

      {/* Pending approvals banner */}
      {pendingCount > 0 && (
        <TouchableOpacity style={styles.approvalBanner}>
          <Text style={styles.approvalBannerText}>
            {pendingCount} pending approval{pendingCount !== 1 ? 's' : ''} — tap to review
          </Text>
        </TouchableOpacity>
      )}

      {/* Agent List */}
      <Text style={styles.sectionTitle}>Your Agents</Text>
      <FlatList
        data={agents}
        renderItem={renderAgent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshBalances}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No agents connected yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first AI agent to get started
            </Text>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: '800',
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  badgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusLg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    ...typography.number,
    color: colors.textPrimary,
  },
  summarySecondary: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  approvalBanner: {
    backgroundColor: colors.warningLight,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  approvalBannerText: {
    ...typography.bodySmall,
    color: colors.warning,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
