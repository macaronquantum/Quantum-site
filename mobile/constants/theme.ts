// Delta-inspired Premium Design System - Market Ready
import { Platform } from 'react-native';

export const COLORS = {
  // Premium Dark Backgrounds
  background: '#0A0A0A',
  surface: '#151515',
  surfaceElevated: '#1E1E1E',
  surfaceHover: '#282828',

  // Borders & Dividers
  border: 'rgba(255, 255, 255, 0.07)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  divider: 'rgba(255, 255, 255, 0.04)',

  // Text Colors
  textPrimary: '#FFFFFF',
  textSecondary: '#9A9A9A',
  textTertiary: '#5A5A5A',
  textDisabled: '#3A3A3A',

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

  // Opportunity / Legacy screen colors
  black: '#000000',
  white: '#FFFFFF',
  darkBlue: '#080C18',
  mediumBlue: 'rgba(139, 92, 246, 0.15)',
  electricBlue: '#8B5CF6',
  lightGray: '#A0A0A0',
  mediumGray: '#2A2A2A',
  glassLight: 'rgba(255, 255, 255, 0.05)',
  glassDark: 'rgba(0, 0, 0, 0.65)',
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

export const SHADOWS = {
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const BOX_SHADOW = {
  none: {},
  sm: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.15)' },
  md: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)' },
  lg: { boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.25)' },
};

export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};
