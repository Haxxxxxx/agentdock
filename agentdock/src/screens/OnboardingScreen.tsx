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
        description: 'DeFi trading agent — executes arbitrage and limit orders across Jupiter and Raydium',
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
        description: 'Monitors wallet activity and revokes suspicious token approvals',
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
        description: 'Optimizes yield across Kamino, Marinade, and Jito vaults',
        status: 'paused' as const,
        apiKeyHash: '',
        createdAt: '2026-02-09T14:00:00Z',
        lastSeenAt: '2026-02-10T02:00:00Z',
        ownerId: 'demo_user',
        solBalance: 45.8,
        usdcBalance: 8340.5,
      },
    ];

    const now = Date.now();
    const DAY = 1000 * 60 * 60 * 24;
    const store = useAgentStore.getState();

    setUser(demoUser);
    setAuthenticated(true);
    store.setAgents(demoAgents);

    // Demo transactions — spread across 7 days for chart visualization
    store.setTransactions('demo_agent_1', [
      {
        id: 'demo_tx_1a',
        agentId: 'demo_agent_1',
        signature: '5xYz...demo1a',
        type: 'swap',
        description: 'Swapped 2.5 SOL for 450 USDC on Jupiter',
        timestamp: new Date(now - 1000 * 60 * 30).toISOString(),
        status: 'success',
        fee: 0.000005,
        from: 'DemoWa11etAddr3ss1111111111111111111111111111',
        to: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
        solAmount: 2.5,
        tokenAmount: 450,
        tokenSymbol: 'USDC',
      },
      {
        id: 'demo_tx_1b',
        agentId: 'demo_agent_1',
        signature: '3dEf...demo1b',
        type: 'swap',
        description: 'Swapped 500 USDC for 2.78 SOL on Raydium',
        timestamp: new Date(now - DAY * 1).toISOString(),
        status: 'success',
        fee: 0.000005,
        from: 'DemoWa11etAddr3ss1111111111111111111111111111',
        to: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
        solAmount: 2.78,
        tokenAmount: 500,
        tokenSymbol: 'USDC',
      },
      {
        id: 'demo_tx_1e',
        agentId: 'demo_agent_1',
        signature: '7pQr...demo1e',
        type: 'swap',
        description: 'Swapped 1.5 SOL for BONK on Jupiter',
        timestamp: new Date(now - DAY * 1 - 1000 * 60 * 90).toISOString(),
        status: 'success',
        fee: 0.000005,
        from: 'DemoWa11etAddr3ss1111111111111111111111111111',
        to: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
        solAmount: 1.5,
      },
      {
        id: 'demo_tx_1c',
        agentId: 'demo_agent_1',
        signature: '8aBc...demo1c',
        type: 'transfer',
        description: 'Transferred 0.5 SOL to profit vault',
        timestamp: new Date(now - DAY * 2).toISOString(),
        status: 'success',
        fee: 0.000005,
        from: 'DemoWa11etAddr3ss1111111111111111111111111111',
        to: 'VaultAddr3ss999999999999999999999999999999999',
        solAmount: 0.5,
      },
      {
        id: 'demo_tx_1f',
        agentId: 'demo_agent_1',
        signature: '4sTu...demo1f',
        type: 'swap',
        description: 'Swapped 3.2 SOL for 576 USDC on Jupiter',
        timestamp: new Date(now - DAY * 3).toISOString(),
        status: 'success',
        fee: 0.000005,
        from: 'DemoWa11etAddr3ss1111111111111111111111111111',
        to: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
        solAmount: 3.2,
        tokenAmount: 576,
        tokenSymbol: 'USDC',
      },
      {
        id: 'demo_tx_1g',
        agentId: 'demo_agent_1',
        signature: '6vWx...demo1g',
        type: 'swap',
        description: 'Swapped 800 USDC for 4.3 SOL on Raydium',
        timestamp: new Date(now - DAY * 4).toISOString(),
        status: 'success',
        fee: 0.000005,
        from: 'DemoWa11etAddr3ss1111111111111111111111111111',
        to: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
        solAmount: 4.3,
        tokenAmount: 800,
        tokenSymbol: 'USDC',
      },
      {
        id: 'demo_tx_1d',
        agentId: 'demo_agent_1',
        signature: '2jKl...demo1d',
        type: 'swap',
        description: 'Swap failed — slippage exceeded on SOL/BONK',
        timestamp: new Date(now - DAY * 5).toISOString(),
        status: 'failed',
        fee: 0.000005,
        from: 'DemoWa11etAddr3ss1111111111111111111111111111',
        to: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        solAmount: 1.2,
      },
      {
        id: 'demo_tx_1h',
        agentId: 'demo_agent_1',
        signature: '9yZa...demo1h',
        type: 'transfer',
        description: 'Transferred 1.0 SOL to profit vault',
        timestamp: new Date(now - DAY * 6).toISOString(),
        status: 'success',
        fee: 0.000005,
        from: 'DemoWa11etAddr3ss1111111111111111111111111111',
        to: 'VaultAddr3ss999999999999999999999999999999999',
        solAmount: 1.0,
      },
    ]);

    store.setTransactions('demo_agent_2', [
      {
        id: 'demo_tx_2a',
        agentId: 'demo_agent_2',
        signature: '7gHi...demo2a',
        type: 'program_interaction',
        description: 'Revoked token approval for suspicious program',
        timestamp: new Date(now - 1000 * 60 * 15).toISOString(),
        status: 'success',
        fee: 0.000005,
        from: 'DemoWa11etAddr3ss2222222222222222222222222222',
        to: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      },
      {
        id: 'demo_tx_2b',
        agentId: 'demo_agent_2',
        signature: '4mNp...demo2b',
        type: 'transfer',
        description: 'Moved 0.1 SOL to monitoring fee account',
        timestamp: new Date(now - DAY * 2).toISOString(),
        status: 'success',
        fee: 0.000005,
        from: 'DemoWa11etAddr3ss2222222222222222222222222222',
        to: 'FeeAcct999999999999999999999999999999999999',
        solAmount: 0.1,
      },
      {
        id: 'demo_tx_2c',
        agentId: 'demo_agent_2',
        signature: '3kLm...demo2c',
        type: 'program_interaction',
        description: 'Scanned wallet — no suspicious approvals found',
        timestamp: new Date(now - DAY * 4).toISOString(),
        status: 'success',
        fee: 0.000005,
        from: 'DemoWa11etAddr3ss2222222222222222222222222222',
        to: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      },
    ]);

    store.setTransactions('demo_agent_3', [
      {
        id: 'demo_tx_3a',
        agentId: 'demo_agent_3',
        signature: '9qRs...demo3a',
        type: 'stake',
        description: 'Staked 10 SOL via Marinade Finance',
        timestamp: new Date(now - DAY * 1).toISOString(),
        status: 'success',
        fee: 0.000005,
        from: 'DemoWa11etAddr3ss3333333333333333333333333333',
        to: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
        solAmount: 10,
      },
      {
        id: 'demo_tx_3b',
        agentId: 'demo_agent_3',
        signature: '6tUv...demo3b',
        type: 'program_interaction',
        description: 'Deposited 2000 USDC into Kamino vault',
        timestamp: new Date(now - DAY * 3).toISOString(),
        status: 'success',
        fee: 0.000005,
        from: 'DemoWa11etAddr3ss3333333333333333333333333333',
        to: 'KAMiNo5aPe7R4wQPCGaKKhLpMibYMeZ3GhH48fCFgQH',
        tokenAmount: 2000,
        tokenSymbol: 'USDC',
      },
      {
        id: 'demo_tx_3c',
        agentId: 'demo_agent_3',
        signature: '1wXy...demo3c',
        type: 'program_interaction',
        description: 'Claimed 3.2 JTO rewards from Jito vault',
        timestamp: new Date(now - DAY * 5).toISOString(),
        status: 'success',
        fee: 0.000005,
        from: 'DemoWa11etAddr3ss3333333333333333333333333333',
        to: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
        tokenAmount: 3.2,
        tokenSymbol: 'JTO',
      },
      {
        id: 'demo_tx_3d',
        agentId: 'demo_agent_3',
        signature: '5bCd...demo3d',
        type: 'stake',
        description: 'Staked 5 SOL into Jito validator',
        timestamp: new Date(now - DAY * 6).toISOString(),
        status: 'success',
        fee: 0.000005,
        from: 'DemoWa11etAddr3ss3333333333333333333333333333',
        to: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
        solAmount: 5,
      },
    ]);

    // Demo spending policies — different profiles per agent
    store.setPolicy('demo_agent_1', {
      id: 'policy_demo_agent_1',
      agentId: 'demo_agent_1',
      dailyLimitSol: 10,
      perTxLimitSol: 3,
      allowlistedPrograms: [
        'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
        '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
      ],
      requireApprovalAbove: 1,
      isActive: true,
      updatedAt: new Date().toISOString(),
    });
    store.setPolicy('demo_agent_2', {
      id: 'policy_demo_agent_2',
      agentId: 'demo_agent_2',
      dailyLimitSol: 0.5,
      perTxLimitSol: 0.1,
      allowlistedPrograms: ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'],
      requireApprovalAbove: 0.05,
      isActive: true,
      updatedAt: new Date().toISOString(),
    });
    store.setPolicy('demo_agent_3', {
      id: 'policy_demo_agent_3',
      agentId: 'demo_agent_3',
      dailyLimitSol: 50,
      perTxLimitSol: 15,
      allowlistedPrograms: [
        'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
        'KAMiNo5aPe7R4wQPCGaKKhLpMibYMeZ3GhH48fCFgQH',
        'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
      ],
      requireApprovalAbove: 5,
      isActive: true,
      updatedAt: new Date().toISOString(),
    });

    // Demo pending approvals — show immediately in badge + approval screen
    store.setPendingApprovals([
      {
        id: 'demo_approval_1',
        agentId: 'demo_agent_1',
        agentName: 'Trading Bot Alpha',
        description: 'Swap 5 SOL for USDC on Jupiter — arbitrage opportunity detected (0.8% spread)',
        status: 'pending',
        createdAt: new Date(now - 1000 * 60 * 2).toISOString(),
        expiresAt: new Date(now + 1000 * 60 * 13).toISOString(),
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
        createdAt: new Date(now - 1000 * 60 * 8).toISOString(),
        expiresAt: new Date(now + 1000 * 60 * 7).toISOString(),
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
        createdAt: new Date(now - 1000 * 60 * 1).toISOString(),
        expiresAt: new Date(now + 1000 * 60 * 4).toISOString(),
        txType: 'program_interaction',
        estimatedSolCost: 0.00001,
        targetProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      },
    ]);
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
