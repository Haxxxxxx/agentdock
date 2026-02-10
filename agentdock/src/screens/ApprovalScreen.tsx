import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme';
import {
  useAgentStore,
  usePendingApprovals,
} from '../store/useAgentStore';
import * as firebaseService from '../services/firebase';
import ApprovalCard from '../components/ApprovalCard';
import type { ApprovalRequest } from '../types';

const DEMO_APPROVALS: ApprovalRequest[] = [
  {
    id: 'demo_approval_1',
    agentId: 'demo_agent_1',
    agentName: 'Trading Bot Alpha',
    description: 'Swap 5 SOL for USDC on Jupiter — arbitrage opportunity detected (0.8% spread)',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 13).toISOString(),
    txType: 'swap',
    estimatedSolCost: 5.0,
    targetProgram: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
    amount: 5.0,
    tokenSymbol: 'SOL',
  },
  {
    id: 'demo_approval_2',
    agentId: 'demo_agent_3',
    agentName: 'Yield Farmer',
    description: 'Deposit 2000 USDC into Kamino vault — projected 12.4% APY',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 7).toISOString(),
    txType: 'program_interaction',
    estimatedSolCost: 0.005,
    targetProgram: 'KAMiNo5aPe7R4wQPCGaKKhLpMibYMeZ3GhH48fCFgQH',
    amount: 2000,
    tokenSymbol: 'USDC',
  },
  {
    id: 'demo_approval_3',
    agentId: 'demo_agent_2',
    agentName: 'Security Monitor',
    description: 'Emergency: Revoke token approval for suspicious program detected on your wallet',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 4).toISOString(),
    txType: 'program_interaction',
    estimatedSolCost: 0.00001,
    targetProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  },
];

export default function ApprovalScreen() {
  const pendingApprovals = usePendingApprovals();
  const { setPendingApprovals, updateApproval } = useAgentStore();

  // Load demo approvals if none exist
  useEffect(() => {
    if (pendingApprovals.length === 0) {
      setPendingApprovals(DEMO_APPROVALS);
    }
  }, []);

  const displayApprovals = pendingApprovals.filter(
    (a) => a.status === 'pending'
  );

  const handleApprove = useCallback(
    async (approvalId: string) => {
      try {
        const isDemo = approvalId.startsWith('demo_');
        if (!isDemo) {
          await firebaseService.respondToApproval(approvalId, 'approved');
        }
        updateApproval(approvalId, 'approved');
        Alert.alert('Approved', 'Transaction has been approved. The agent can proceed.');
      } catch (error) {
        Alert.alert('Error', 'Failed to approve. Please try again.');
      }
    },
    [updateApproval]
  );

  const handleDeny = useCallback(
    async (approvalId: string) => {
      try {
        const isDemo = approvalId.startsWith('demo_');
        if (!isDemo) {
          await firebaseService.respondToApproval(approvalId, 'denied');
        }
        updateApproval(approvalId, 'denied');
        Alert.alert('Denied', 'Transaction has been denied. The agent has been notified.');
      } catch (error) {
        Alert.alert('Error', 'Failed to deny. Please try again.');
      }
    },
    [updateApproval]
  );

  const renderApproval = ({ item }: { item: ApprovalRequest }) => (
    <ApprovalCard
      approval={item}
      onApprove={() => handleApprove(item.id)}
      onDeny={() => handleDeny(item.id)}
    />
  );

  const resolvedApprovals = pendingApprovals.filter(
    (a) => a.status !== 'pending'
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Approvals</Text>

      {displayApprovals.length > 0 && (
        <View style={styles.countBanner}>
          <Text style={styles.countText}>
            {displayApprovals.length} pending request
            {displayApprovals.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <FlatList
        data={displayApprovals}
        keyExtractor={(item) => item.id}
        renderItem={renderApproval}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyText}>All caught up!</Text>
            <Text style={styles.emptySubtext}>
              No pending approvals from your agents
            </Text>
          </View>
        }
        ListFooterComponent={
          resolvedApprovals.length > 0 ? (
            <View style={styles.resolvedSection}>
              <Text style={styles.resolvedTitle}>Recently Resolved</Text>
              {resolvedApprovals.slice(0, 5).map((a) => (
                <View key={a.id} style={styles.resolvedItem}>
                  <View
                    style={[
                      styles.resolvedDot,
                      {
                        backgroundColor:
                          a.status === 'approved' ? colors.success : colors.error,
                      },
                    ]}
                  />
                  <View style={styles.resolvedInfo}>
                    <Text style={styles.resolvedAgent}>{a.agentName}</Text>
                    <Text style={styles.resolvedDesc} numberOfLines={1}>
                      {a.description}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.resolvedStatus,
                      {
                        color:
                          a.status === 'approved' ? colors.success : colors.error,
                      },
                    ]}
                  >
                    {a.status}
                  </Text>
                </View>
              ))}
            </View>
          ) : null
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
  countBanner: {
    backgroundColor: colors.warningLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.sm,
  },
  countText: {
    ...typography.bodySmall,
    color: colors.warning,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  resolvedSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  resolvedTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  resolvedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  resolvedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  resolvedInfo: {
    flex: 1,
  },
  resolvedAgent: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  resolvedDesc: {
    ...typography.caption,
    color: colors.textMuted,
  },
  resolvedStatus: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
