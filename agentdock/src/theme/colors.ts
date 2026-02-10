export const colors = {
  // Background
  background: '#0A0E1A',
  surface: '#111827',
  surfaceLight: '#1F2937',
  surfaceBorder: '#374151',

  // Brand
  primary: '#6366F1', // Indigo
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  accent: '#22D3EE', // Cyan

  // Semantic
  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.15)',

  // Text
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textInverse: '#0A0E1A',

  // Agent status
  agentActive: '#10B981',
  agentPaused: '#F59E0B',
  agentOffline: '#6B7280',

  // Approval
  approved: '#10B981',
  denied: '#EF4444',
  pending: '#F59E0B',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.6)',
  divider: '#1F2937',

  // Opacity
  white10: 'rgba(255, 255, 255, 0.1)',
  white20: 'rgba(255, 255, 255, 0.2)',
  white60: 'rgba(255, 255, 255, 0.6)',
  primary15: 'rgba(99, 102, 241, 0.15)',
} as const;

export type Colors = typeof colors;
