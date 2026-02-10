import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme';
import { useAgentStore, useUser, useAgents } from '../store/useAgentStore';
import * as firebaseService from '../services/firebase';
import PolicyEditor from '../components/PolicyEditor';
import type { SpendingPolicy } from '../types';

export default function SettingsScreen() {
  const user = useUser();
  const agents = useAgents();
  const { setUser, setAuthenticated, reset, setPolicy, policies } = useAgentStore();
  const [selectedAgentForPolicy, setSelectedAgentForPolicy] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    user?.notificationsEnabled ?? true
  );

  const handleSignOut = useCallback(async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            if (user?.id !== 'demo_user') {
              await firebaseService.signOut();
            }
            reset();
          } catch (error) {
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
  }, [user, reset]);

  const handleToggleNotifications = useCallback(
    async (value: boolean) => {
      setNotificationsEnabled(value);
      if (user && user.id !== 'demo_user') {
        await firebaseService.updateUserDoc(user.id, {
          notificationsEnabled: value,
        });
      }
      if (user) {
        setUser({ ...user, notificationsEnabled: value });
      }
    },
    [user, setUser]
  );

  const handleSavePolicy = useCallback(
    async (policy: SpendingPolicy) => {
      try {
        if (!policy.agentId.startsWith('demo_')) {
          await firebaseService.setPolicy(policy);
        }
        setPolicy(policy.agentId, policy);
        setSelectedAgentForPolicy(null);
        Alert.alert('Saved', 'Spending policy updated successfully');
      } catch (error) {
        Alert.alert('Error', 'Failed to save policy');
      }
    },
    [setPolicy]
  );

  // Show policy editor if agent selected
  if (selectedAgentForPolicy) {
    const agent = agents.find((a) => a.id === selectedAgentForPolicy);
    const existingPolicy = policies[selectedAgentForPolicy];
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.policyHeader}>
          <TouchableOpacity onPress={() => setSelectedAgentForPolicy(null)}>
            <Text style={styles.backButton}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.policyTitle}>
            Policy: {agent?.name || 'Agent'}
          </Text>
        </View>
        <PolicyEditor
          agentId={selectedAgentForPolicy}
          initialPolicy={existingPolicy ?? undefined}
          onSave={handleSavePolicy}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user?.email || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{user?.displayName || 'N/A'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Agents</Text>
              <Text style={styles.value}>{agents.length}</Text>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Push Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{
                  false: colors.surfaceBorder,
                  true: colors.primary,
                }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Spending Policies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending Policies</Text>
          <View style={styles.card}>
            {agents.length === 0 ? (
              <Text style={styles.emptyText}>No agents to configure</Text>
            ) : (
              agents.map((agent) => (
                <TouchableOpacity
                  key={agent.id}
                  style={styles.agentPolicyRow}
                  onPress={() => setSelectedAgentForPolicy(agent.id)}
                >
                  <View>
                    <Text style={styles.agentPolicyName}>{agent.name}</Text>
                    <Text style={styles.agentPolicyStatus}>
                      {policies[agent.id]
                        ? `${policies[agent.id].dailyLimitSol} SOL/day limit`
                        : 'No policy set'}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>{'>'}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Version</Text>
              <Text style={styles.value}>1.0.0</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Network</Text>
              <Text style={styles.value}>
                {process.env.EXPO_PUBLIC_SOLANA_NETWORK || 'devnet'}
              </Text>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radiusLg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
  },
  agentPolicyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  agentPolicyName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  agentPolicyStatus: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  chevron: {
    ...typography.body,
    color: colors.textMuted,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    padding: spacing.md,
  },
  signOutButton: {
    backgroundColor: colors.errorLight,
    borderRadius: spacing.radiusMd,
    height: spacing.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  signOutText: {
    ...typography.button,
    color: colors.error,
  },
  policyHeader: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
  },
  backButton: {
    ...typography.body,
    color: colors.primaryLight,
    marginBottom: spacing.sm,
  },
  policyTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
});
