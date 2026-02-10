import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { colors, spacing, typography } from '../theme';
import type { SpendingPolicy } from '../types';

interface PolicyEditorProps {
  agentId: string;
  initialPolicy?: SpendingPolicy;
  onSave: (policy: SpendingPolicy) => void;
}

export default function PolicyEditor({
  agentId,
  initialPolicy,
  onSave,
}: PolicyEditorProps) {
  const [dailyLimit, setDailyLimit] = useState(
    String(initialPolicy?.dailyLimitSol ?? 10)
  );
  const [perTxLimit, setPerTxLimit] = useState(
    String(initialPolicy?.perTxLimitSol ?? 2)
  );
  const [approvalThreshold, setApprovalThreshold] = useState(
    String(initialPolicy?.requireApprovalAbove ?? 1)
  );
  const [isActive, setIsActive] = useState(initialPolicy?.isActive ?? true);
  const [programs, setPrograms] = useState<string[]>(
    initialPolicy?.allowlistedPrograms ?? []
  );
  const [newProgram, setNewProgram] = useState('');

  const handleAddProgram = () => {
    const trimmed = newProgram.trim();
    if (!trimmed) return;
    if (programs.includes(trimmed)) {
      Alert.alert('Duplicate', 'Program already in the list');
      return;
    }
    setPrograms([...programs, trimmed]);
    setNewProgram('');
  };

  const handleRemoveProgram = (program: string) => {
    setPrograms(programs.filter((p) => p !== program));
  };

  const handleSave = () => {
    const daily = parseFloat(dailyLimit);
    const perTx = parseFloat(perTxLimit);
    const threshold = parseFloat(approvalThreshold);

    if (isNaN(daily) || daily <= 0) {
      Alert.alert('Invalid', 'Daily limit must be a positive number');
      return;
    }
    if (isNaN(perTx) || perTx <= 0) {
      Alert.alert('Invalid', 'Per-tx limit must be a positive number');
      return;
    }
    if (isNaN(threshold) || threshold <= 0) {
      Alert.alert('Invalid', 'Approval threshold must be a positive number');
      return;
    }
    if (perTx > daily) {
      Alert.alert('Invalid', 'Per-tx limit cannot exceed daily limit');
      return;
    }

    onSave({
      id: initialPolicy?.id || `policy_${agentId}`,
      agentId,
      dailyLimitSol: daily,
      perTxLimitSol: perTx,
      requireApprovalAbove: threshold,
      allowlistedPrograms: programs,
      isActive,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Active Toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.label}>Policy Active</Text>
        <Switch
          value={isActive}
          onValueChange={setIsActive}
          trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      {/* Daily Limit */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Daily Spending Limit (SOL)</Text>
        <TextInput
          style={styles.input}
          value={dailyLimit}
          onChangeText={setDailyLimit}
          keyboardType="decimal-pad"
          placeholder="10"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.hint}>
          Maximum SOL the agent can spend per day
        </Text>
      </View>

      {/* Per-Tx Limit */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Per-Transaction Limit (SOL)</Text>
        <TextInput
          style={styles.input}
          value={perTxLimit}
          onChangeText={setPerTxLimit}
          keyboardType="decimal-pad"
          placeholder="2"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.hint}>
          Maximum SOL per single transaction
        </Text>
      </View>

      {/* Approval Threshold */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Require Approval Above (SOL)</Text>
        <TextInput
          style={styles.input}
          value={approvalThreshold}
          onChangeText={setApprovalThreshold}
          keyboardType="decimal-pad"
          placeholder="1"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.hint}>
          Transactions above this amount need your approval
        </Text>
      </View>

      {/* Allowlisted Programs */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Allowlisted Programs</Text>
        <View style={styles.programInputRow}>
          <TextInput
            style={[styles.input, styles.programInput]}
            value={newProgram}
            onChangeText={setNewProgram}
            placeholder="Program address..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddProgram}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.programTags}>
          {programs.map((program) => (
            <View key={program} style={styles.programTag}>
              <Text style={styles.programTagText} numberOfLines={1}>
                {program.slice(0, 8)}...{program.slice(-4)}
              </Text>
              <TouchableOpacity
                onPress={() => handleRemoveProgram(program)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.removeText}>x</Text>
              </TouchableOpacity>
            </View>
          ))}
          {programs.length === 0 && (
            <Text style={styles.hint}>
              No programs allowlisted — all programs allowed
            </Text>
          )}
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Policy</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 16,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  programInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  programInput: {
    flex: 1,
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 28,
  },
  programTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  programTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: spacing.radiusSm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  programTagText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    maxWidth: 120,
  },
  removeText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusMd,
    height: spacing.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.white,
  },
});
