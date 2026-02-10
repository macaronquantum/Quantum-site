import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Index() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Top Section */}
        <View style={styles.topSection}>
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
                <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Institutional Grade</Text>
                <Text style={styles.featureDesc}>Bank-level security</Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Ionicons name="trending-up" size={18} color={COLORS.success} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>AI Investment DAO</Text>
                <Text style={styles.featureDesc}>Curated opportunities</Text>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Ionicons name="wallet" size={18} color={COLORS.warning} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Token-Based Power</Text>
                <Text style={styles.featureDesc}>Proportional voting</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Section - Always visible */}
        <View style={styles.bottomSection}>
          <Link href="/(tabs)/portfolio" asChild>
            <Pressable style={styles.primaryButton}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Access Platform</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.textPrimary} />
              </LinearGradient>
            </Pressable>
          </Link>
          <Text style={styles.disclaimer}>Built on Solana • Powered by Quantum IA</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    minHeight: SCREEN_HEIGHT - 100,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.base,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 32,
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
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
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
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.normal,
    color: COLORS.textTertiary,
  },
  bottomSection: {
    paddingTop: SPACING.xl,
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
