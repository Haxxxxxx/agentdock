import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, typography } from '../theme';
import type { DailySpending } from '../types';

interface SpendingChartProps {
  data: DailySpending[];
}

const screenWidth = Dimensions.get('window').width - spacing.screenPadding * 2;

export default function SpendingChart({ data }: SpendingChartProps) {
  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No spending data yet</Text>
      </View>
    );
  }

  const totalSpent = data.reduce((sum, d) => sum + d.totalSol, 0);
  const totalTxs = data.reduce((sum, d) => sum + d.txCount, 0);

  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        data: data.map((d) => d.totalSol),
        color: () => colors.primary,
        strokeWidth: 2,
      },
    ],
  };

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalSpent.toFixed(2)} SOL</Text>
          <Text style={styles.summaryLabel}>Total Spent</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalTxs}</Text>
          <Text style={styles.summaryLabel}>Transactions</Text>
        </View>
      </View>

      {/* Chart */}
      <LineChart
        data={chartData}
        width={screenWidth}
        height={180}
        chartConfig={{
          backgroundColor: colors.surface,
          backgroundGradientFrom: colors.surface,
          backgroundGradientTo: colors.surface,
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
          labelColor: () => colors.textMuted,
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: colors.primary,
          },
          propsForBackgroundLines: {
            stroke: colors.surfaceBorder,
            strokeDasharray: '4',
          },
          style: {
            borderRadius: spacing.radiusMd,
          },
        }}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={false}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        fromZero
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusLg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.lg,
  },
  summaryItem: {},
  summaryValue: {
    ...typography.number,
    color: colors.textPrimary,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  chart: {
    borderRadius: spacing.radiusMd,
    marginLeft: -spacing.md,
  },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusLg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
});
