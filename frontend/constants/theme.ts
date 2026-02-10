// Delta-inspired Premium Design System - Market Ready

export const COLORS = {
  // Premium Dark Backgrounds
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceElevated: '#242424',
  surfaceHover: '#2A2A2A',
  
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
  primary: '#8B5CF6',
  primaryDark: '#7C3AED',
  primaryLight: '#A78BFA',
  
  success: '#10B981',
  successDark: '#059669',
  
  error: '#EF4444',
  errorDark: '#DC2626',
  
  warning: '#F59E0B',
  warningDark: '#D97706',
  
  gold: '#F59E0B',
  platinum: '#E5E7EB',
  
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

// No deprecated shadow* props - using modern boxShadow
export const BOX_SHADOW = {
  none: {},
  sm: {
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.15)',
  },
  md: {
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)',
  },
  lg: {
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)',
  },
};

export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};
