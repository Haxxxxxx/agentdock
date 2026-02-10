import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme';
import { useAgentStore } from '../store/useAgentStore';
import * as firebaseService from '../services/firebase';
import { isValidSolanaAddress } from '../services/solana';

type Mode = 'login' | 'signup' | 'addAgent';

export default function OnboardingScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agentName, setAgentName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const { setUser, setAuthenticated, addAgent } = useAgentStore();

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const result =
        mode === 'signup'
          ? await firebaseService.signUp(email, password)
          : await firebaseService.signIn(email, password);

      const userDoc = await firebaseService.getUserDoc(result.user.uid);
      if (!userDoc) {
        const newUser = await firebaseService.createUserDoc(result.user);
        setUser(newUser);
      } else {
        setUser(userDoc);
      }
      setAuthenticated(true);
      setMode('addAgent');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Auth failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgent = async () => {
    if (!agentName.trim()) {
      Alert.alert('Error', 'Enter an agent name');
      return;
    }
    if (!isValidSolanaAddress(walletAddress)) {
      Alert.alert('Error', 'Enter a valid Solana wallet address');
      return;
    }

    const user = useAgentStore.getState().user;
    if (!user) return;

    setLoading(true);
    try {
      const agent = {
        id: `agent_${Date.now()}`,
        name: agentName.trim(),
        walletAddress: walletAddress.trim(),
        description: '',
        status: 'active' as const,
        apiKeyHash: '',
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        ownerId: user.id,
      };

      await firebaseService.addAgent(agent);
      await firebaseService.updateUserDoc(user.id, {
        agentIds: [...user.agentIds, agent.id],
      });
      addAgent(agent);
      setUser({ ...user, agentIds: [...user.agentIds, agent.id] });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add agent');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    const demoUser = {
      id: 'demo_user',
      email: 'demo@agentdock.app',
      displayName: 'Demo User',
      createdAt: new Date().toISOString(),
      agentIds: ['demo_agent_1', 'demo_agent_2', 'demo_agent_3'],
      notificationsEnabled: false,
    };

    const demoAgents = [
      {
        id: 'demo_agent_1',
        name: 'Trading Bot Alpha',
        walletAddress: 'DemoWa11etAddr3ss1111111111111111111111111111',
        description: 'DeFi trading agent',
        status: 'active' as const,
        apiKeyHash: '',
        createdAt: '2026-02-08T10:00:00Z',
        lastSeenAt: new Date().toISOString(),
        ownerId: 'demo_user',
        solBalance: 12.45,
        usdcBalance: 1520.0,
      },
      {
        id: 'demo_agent_2',
        name: 'Security Monitor',
        walletAddress: 'DemoWa11etAddr3ss2222222222222222222222222222',
        description: 'Monitors for suspicious activity',
        status: 'active' as const,
        apiKeyHash: '',
        createdAt: '2026-02-07T08:00:00Z',
        lastSeenAt: new Date().toISOString(),
        ownerId: 'demo_user',
        solBalance: 3.2,
        usdcBalance: 250.0,
      },
      {
        id: 'demo_agent_3',
        name: 'Yield Farmer',
        walletAddress: 'DemoWa11etAddr3ss3333333333333333333333333333',
        description: 'Optimizes yield across protocols',
        status: 'paused' as const,
        apiKeyHash: '',
        createdAt: '2026-02-09T14:00:00Z',
        lastSeenAt: '2026-02-10T02:00:00Z',
        ownerId: 'demo_user',
        solBalance: 45.8,
        usdcBalance: 8340.5,
      },
    ];

    setUser(demoUser);
    setAuthenticated(true);
    useAgentStore.getState().setAgents(demoAgents);
  };

  if (mode === 'addAgent') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Connect an Agent</Text>
          <Text style={styles.subtitle}>
            Enter your AI agent's details to start monitoring
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Agent Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Trading Bot Alpha"
              placeholderTextColor={colors.textMuted}
              value={agentName}
              onChangeText={setAgentName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Solana Wallet Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter agent's wallet address"
              placeholderTextColor={colors.textMuted}
              value={walletAddress}
              onChangeText={setWalletAddress}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAddAgent}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Connect Agent</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>AgentDock</Text>
          <Text style={styles.tagline}>
            The human layer for AI agents on Solana
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>
              {mode === 'signup' ? 'Create Account' : 'Sign In'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
          style={styles.switchMode}
        >
          <Text style={styles.switchText}>
            {mode === 'login'
              ? "Don't have an account? Sign Up"
              : 'Already have an account? Sign In'}
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity style={styles.demoButton} onPress={handleDemoMode}>
          <Text style={styles.demoButtonText}>Try Demo Mode</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    ...typography.h1,
    fontSize: 36,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: -1,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
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
  button: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusMd,
    height: spacing.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
  switchMode: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  switchText: {
    ...typography.bodySmall,
    color: colors.primaryLight,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceBorder,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
    marginHorizontal: spacing.md,
  },
  demoButton: {
    backgroundColor: colors.surfaceLight,
    borderRadius: spacing.radiusMd,
    height: spacing.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  demoButtonText: {
    ...typography.button,
    color: colors.accent,
  },
});
