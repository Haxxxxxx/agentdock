import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import type { ApprovalRequest } from '../types';

interface ApprovalCardProps {
  approval: ApprovalRequest;
  onApprove: () => void;
  onDeny: () => void;
}

export default function ApprovalCard({
  approval,
  onApprove,
  onDeny,
}: ApprovalCardProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const expires = new Date(approval.expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}m ${secs}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [approval.expiresAt]);

  const isExpired = timeLeft === 'Expired';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.agentBadge}>
          <Text style={styles.agentName}>{approval.agentName}</Text>
        </View>
        <View
          style={[
            styles.timerBadge,
            isExpired && { backgroundColor: colors.errorLight },
          ]}
        >
          <Text
            style={[
              styles.timerText,
              isExpired && { color: colors.error },
            ]}
          >
            {timeLeft}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description}>{approval.description}</Text>

      {/* Details */}
      <View style={styles.detailsRow}>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Type</Text>
          <Text style={styles.detailValue}>{approval.txType}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Est. Cost</Text>
          <Text style={styles.detailValue}>
            {approval.estimatedSolCost} SOL
          </Text>
        </View>
        {approval.amount != null && (
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>
              {approval.amount} {approval.tokenSymbol || 'SOL'}
            </Text>
          </View>
        )}
      </View>

      {/* Target program */}
      {approval.targetProgram && (
        <View style={styles.programRow}>
          <Text style={styles.programLabel}>Program</Text>
          <Text style={styles.programValue} numberOfLines={1}>
            {approval.targetProgram.slice(0, 8)}...
            {approval.targetProgram.slice(-4)}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.denyButton]}
          onPress={onDeny}
          disabled={isExpired}
        >
          <Text style={[styles.buttonText, styles.denyText]}>Deny</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.approveButton,
            isExpired && styles.buttonDisabled,
          ]}
          onPress={onApprove}
          disabled={isExpired}
        >
          <Text style={[styles.buttonText, styles.approveText]}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusLg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  agentBadge: {
    backgroundColor: colors.primary15,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radiusSm,
  },
  agentName: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  timerBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radiusSm,
  },
  timerText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  description: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  detail: {
    flex: 1,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  programLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  programValue: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: spacing.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
  },
  denyButton: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...typography.button,
  },
  denyText: {
    color: colors.error,
  },
  approveText: {
    color: colors.white,
  },
});
