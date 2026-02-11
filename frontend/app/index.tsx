import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Index() {
  const router = useRouter();
  
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      
      {/* Center content area */}
      <View style={styles.centerSection}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../assets/images/quantum-logo.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.title}>QUANTUM</Text>
          <Text style={styles.subtitle}>Institutional DAO Governance</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Institutional Grade</Text>
              <Text style={styles.featureDesc}>Bank-level security</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="trending-up" size={16} color={COLORS.success} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>AI Investment DAO</Text>
              <Text style={styles.featureDesc}>Curated opportunities</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="wallet" size={16} color={COLORS.warning} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Token-Based Power</Text>
              <Text style={styles.featureDesc}>Proportional voting</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom pinned button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.push('/(tabs)/portfolio')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Access Platform</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.textPrimary} />
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>Built on Solana • Powered by Quantum IA</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoWrapper: {
    width: 72,
    height: 72,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
  },
  logoImage: {
    width: 72,
    height: 72,
  },
  title: {
    fontSize: 30,
    fontWeight: FONT_WEIGHTS.heavy,
    color: COLORS.textPrimary,
    letterSpacing: 3,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.normal,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  features: {
    gap: SPACING.sm,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    marginBottom: 1,
  },
  featureDesc: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.normal,
    color: COLORS.textTertiary,
  },
  bottomSection: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.base,
  },
  primaryButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 16,
  },
  buttonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  disclaimer: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.normal,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
