import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Index() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
    gap: SPACING.xxxl,
  },
  header: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: SPACING.xl,
    borderRadius: BORDER_RADIUS.xxl,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
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
    fontWeight: FONT_WEIGHTS.normal,
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
    fontWeight: FONT_WEIGHTS.normal,
    color: COLORS.textSecondary,
  },
  ctaSection: {
    gap: SPACING.lg,
    paddingBottom: SPACING.xl,
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
    fontWeight: FONT_WEIGHTS.normal,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
});
