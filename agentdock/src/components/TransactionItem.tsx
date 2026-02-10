import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { colors, spacing, typography } from '../theme';
import type { AgentTransaction, TransactionType } from '../types';

interface TransactionItemProps {
  transaction: AgentTransaction;
}

const TYPE_ICONS: Record<TransactionType, string> = {
  transfer: '↗',
  swap: '⇄',
  stake: '⬆',
  program_interaction: '◆',
  unknown: '•',
};

const TYPE_LABELS: Record<TransactionType, string> = {
  transfer: 'Transfer',
  swap: 'Swap',
  stake: 'Stake',
  program_interaction: 'Program',
  unknown: 'Unknown',
};

export default function TransactionItem({ transaction }: TransactionItemProps) {
  const icon = TYPE_ICONS[transaction.type] || '•';
  const typeLabel = TYPE_LABELS[transaction.type] || 'Unknown';
  const isSuccess = transaction.status === 'success';
  const timeAgo = formatDistanceToNow(new Date(transaction.timestamp), {
    addSuffix: true,
  });

  const openExplorer = () => {
    if (transaction.signature.includes('demo')) return;
    const url = `https://solscan.io/tx/${transaction.signature}`;
    Linking.openURL(url);
  };

  const amountText = transaction.solAmount
    ? `${transaction.solAmount.toFixed(4)} SOL`
    : transaction.tokenAmount
      ? `${transaction.tokenAmount} ${transaction.tokenSymbol || 'SPL'}`
      : '';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={openExplorer}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Text style={[styles.icon, { color: isSuccess ? colors.success : colors.error }]}>
          {icon}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.description} numberOfLines={1}>
            {transaction.description}
          </Text>
          {amountText ? (
            <Text
              style={[
                styles.amount,
                { color: transaction.type === 'transfer' ? colors.error : colors.textPrimary },
              ]}
            >
              {amountText}
            </Text>
          ) : null}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.metaRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isSuccess
                    ? colors.successLight
                    : colors.errorLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: isSuccess ? colors.success : colors.error },
                ]}
              >
                {transaction.status}
              </Text>
            </View>
            <Text style={styles.type}>{typeLabel}</Text>
          </View>
          <Text style={styles.time}>{timeAgo}</Text>
        </View>

        <Text style={styles.signature}>
          {transaction.signature.slice(0, 8)}...{transaction.signature.slice(-4)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  amount: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: spacing.radiusSm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  type: {
    ...typography.caption,
    color: colors.textMuted,
  },
  time: {
    ...typography.caption,
    color: colors.textMuted,
  },
  signature: {
    ...typography.caption,
    color: colors.textMuted,
    fontFamily: 'monospace',
    fontSize: 10,
  },
});
