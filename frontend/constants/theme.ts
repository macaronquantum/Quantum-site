// Delta-inspired Premium Design System

export const COLORS = {
  // Premium Dark Backgrounds
  background: '#0D0D0D',          // Deep near-black
  surface: '#1A1A1A',             // Dark gray for cards
  surfaceElevated: '#242424',     // Elevated surface
  surfaceHover: '#2A2A2A',        // Hover state
  
  // Borders & Dividers
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  divider: 'rgba(255, 255, 255, 0.05)',
  
  // Text Colors
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#6B6B6B',
  textDisabled: '#4A4A4A',
  
  // Accent Colors - Delta Style
  primary: '#8B5CF6',             // Vibrant Purple/Magenta
  primaryDark: '#7C3AED',
  primaryLight: '#A78BFA',
  
  success: '#10B981',             // Bright green
  successDark: '#059669',
  
  error: '#EF4444',
  errorDark: '#DC2626',
  
  warning: '#F59E0B',
  warningDark: '#D97706',
  
  // Premium accents
  gold: '#F59E0B',
  platinum: '#E5E7EB',
  
  // Chart colors
  chartPositive: '#10B981',
  chartNegative: '#EF4444',
  chartNeutral: '#6B7280',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
  huge: 48,
};

export const FONT_WEIGHTS = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const BORDER_RADIUS = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

// Delta-style Shadows
export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  strong: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Animation timing
export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// Common Styles
export const COMMON_STYLES = {
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.base,
    ...SHADOWS.subtle,
  },
  cardElevated: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.base,
    ...SHADOWS.medium,
  },
  button: {
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonSuccess: {
    backgroundColor: COLORS.success,
  },
};
