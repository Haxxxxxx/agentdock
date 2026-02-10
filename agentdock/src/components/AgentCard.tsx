import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { shortenAddress } from '../services/solana';
import type { Agent } from '../types';

interface AgentCardProps {
  agent: Agent;
  onPress: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: colors.agentActive,
  paused: colors.agentPaused,
  offline: colors.agentOffline,
};

export default function AgentCard({ agent, onPress }: AgentCardProps) {
  const statusColor = STATUS_COLORS[agent.status] || colors.agentOffline;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <View style={styles.nameRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.name} numberOfLines={1}>
            {agent.name}
          </Text>
        </View>
        <Text style={[styles.statusLabel, { color: statusColor }]}>
          {agent.status}
        </Text>
      </View>

      <Text style={styles.wallet}>
        {shortenAddress(agent.walletAddress, 6)}
      </Text>

      <View style={styles.balanceRow}>
        <View style={styles.balanceBlock}>
          <Text style={styles.balanceValue}>
            {(agent.solBalance ?? 0).toFixed(2)}
          </Text>
          <Text style={styles.balanceLabel}>SOL</Text>
        </View>
        <View style={styles.balanceDivider} />
        <View style={styles.balanceBlock}>
          <Text style={styles.balanceValue}>
            ${(agent.usdcBalance ?? 0).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </Text>
          <Text style={styles.balanceLabel}>USDC</Text>
        </View>
      </View>

      {agent.lastSeenAt && (
        <Text style={styles.lastSeen}>
          Last seen: {new Date(agent.lastSeenAt).toLocaleString()}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusLg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  statusLabel: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  wallet: {
    ...typography.caption,
    color: colors.textMuted,
    fontFamily: 'monospace',
    marginBottom: spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceBlock: {
    flex: 1,
    alignItems: 'center',
  },
  balanceValue: {
    ...typography.number,
    color: colors.textPrimary,
  },
  balanceLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  balanceDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.surfaceBorder,
  },
  lastSeen: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
