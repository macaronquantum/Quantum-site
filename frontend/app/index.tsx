import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

export default function Index() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        {/* Logo & Branding */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/quantum-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>QUANTUM</Text>
          <Text style={styles.subtitle}>Institutional DAO Governance</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.featureTitle}>Institutional Grade</Text>
            <Text style={styles.featureDesc}>Bank-level security</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="trending-up" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.featureTitle}>AI Investment DAO</Text>
            <Text style={styles.featureDesc}>Curated opportunities</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="wallet" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.featureTitle}>Token-Based Power</Text>
            <Text style={styles.featureDesc}>Proportional voting</Text>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <Link href="/(tabs)/portfolio" asChild>
            <Pressable style={styles.primaryButton}>
              {({ pressed }) => (
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.buttonGradient, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.buttonText}>Access Platform</Text>
                  <Ionicons name="arrow-forward" size={18} color={COLORS.textPrimary} />
                </LinearGradient>
              )}
            </Pressable>
          </Link>
          <Text style={styles.disclaimer}>Built on Solana • Production Ready</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: 80,
    paddingBottom: 50,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: SPACING.xl,
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.heavy,
    color: COLORS.textPrimary,
    letterSpacing: 4,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  features: {
    gap: SPACING.base,
  },
  featureCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.subtle,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  featureTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  featureDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  ctaSection: {
    gap: SPACING.lg,
  },
  primaryButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  disclaimer: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
});
