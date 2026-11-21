export const colors = {
  background: '#0A0A0A',
  surface: '#141416',
  surfaceLight: '#1C1C1F',
  surfaceHighlight: '#232327',
  border: '#26262A',
  borderLight: '#323238',
  text: '#F5F5F7',
  textSecondary: '#9B9BA3',
  textMuted: '#5C5C66',
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  primarySoft: 'rgba(99, 102, 241, 0.14)',
  success: '#22C55E',
  successSoft: 'rgba(34, 197, 94, 0.14)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.14)',
  error: '#EF4444',
  errorSoft: 'rgba(239, 68, 68, 0.14)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const statusMeta: Record<
  string,
  { label: string; color: string; soft: string }
> = {
  draft: { label: 'Draft', color: colors.textSecondary, soft: colors.surfaceHighlight },
  processing: { label: 'Processing', color: colors.warning, soft: colors.warningSoft },
  completed: { label: 'Completed', color: colors.success, soft: colors.successSoft },
  failed: { label: 'Failed', color: colors.error, soft: colors.errorSoft },
};
