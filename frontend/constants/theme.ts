export const COLORS = {
  // Primary - Institutional Dark Palette
  background: '#0A0E14',
  surface: '#12171E',
  surfaceElevated: '#1A2028',
  
  // Borders & Dividers
  border: '#2A2F38',
  borderLight: '#353A45',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A4AB',
  textTertiary: '#6B7280',
  
  // Accents - Refined
  primary: '#3B82F6',      // Professional blue
  primaryDark: '#2563EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  
  // Institutional touches
  gold: '#D4AF37',         // Muted gold
  platinum: '#E5E7EB',
  
  // Transparents
  overlay: 'rgba(10, 14, 20, 0.95)',
  glassSubtle: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.06)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  base: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
};

export const FONT_WEIGHTS = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
};

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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
};
