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
        {/* Logo - Arrondi */}
        <View style={styles.logoSection}>
          <View style={styles.logoWrapper}>
            <Image 
              source={require('../assets/images/quantum-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>QUANTUM</Text>
          <Text style={styles.subtitle}>Institutional DAO Governance</Text>
        </View>

        {/* Features compactes */}
        <View style={styles.features}>
          <View style={styles.featureCard}>
            <Ionicons name="shield-checkmark" size={18} color={COLORS.primary} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Institutional Grade</Text>
              <Text style={styles.featureDesc}>Bank-level security</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="trending-up" size={18} color={COLORS.success} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>AI Investment DAO</Text>
              <Text style={styles.featureDesc}>Curated opportunities</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="wallet" size={18} color={COLORS.warning} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Token-Based Power</Text>
              <Text style={styles.featureDesc}>Proportional voting</Text>
            </View>
          </View>
        </View>

        {/* CTA */}
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
        
        <Text style={styles.disclaimer}>Built on Solana</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.base, paddingVertical: SPACING.lg, gap: SPACING.lg },
  logoSection: { alignItems: 'center', marginBottom: SPACING.sm },
  logoWrapper: { borderRadius: BORDER_RADIUS.xxl, overflow: 'hidden', backgroundColor: COLORS.surface, padding: SPACING.sm, marginBottom: SPACING.base },
  logoImage: { width: 60, height: 60, borderRadius: BORDER_RADIUS.xl },
  title: { fontSize: 28, fontWeight: FONT_WEIGHTS.heavy, color: COLORS.textPrimary, letterSpacing: 2, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.normal, color: COLORS.textSecondary },
  features: { gap: SPACING.sm, marginBottom: SPACING.sm },
  featureCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: SPACING.md },
  featureText: { flex: 1 },
  featureTitle: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, marginBottom: 2 },
  featureDesc: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.normal, color: COLORS.textSecondary },
  primaryButton: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', marginTop: SPACING.sm },
  buttonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.base },
  buttonText: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary },
  disclaimer: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.normal, color: COLORS.textTertiary, textAlign: 'center', marginTop: SPACING.md },
});
