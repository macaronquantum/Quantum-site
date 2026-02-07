import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';

export default function Index() {
  const router = useRouter();

  const handleEnterPlatform = () => {
    console.log('Button clicked - Navigating to portfolio...');
    try {
      router.push('/(tabs)/portfolio');
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback navigation
      router.replace('/(tabs)/portfolio');
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.black, COLORS.darkBlue, COLORS.mediumBlue]}
      style={styles.container}
    >
      <StatusBar style="light" />
      
      <View style={styles.content}>
        {/* Logo Area */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>Q</Text>
          </View>
          <Text style={styles.title}>QUANTUM IA</Text>
          <Text style={styles.subtitle}>Web3 DAO Governance Platform</Text>
        </View>

        {/* Feature Highlights */}
        <View style={styles.features}>
          <FeatureItem 
            icon="💼" 
            title="Portfolio Management"
            description="Track your Quantum & Co-Quantum holdings"
          />
          <FeatureItem 
            icon="🚀" 
            title="AI Investments"
            description="Vote on curated AI opportunities monthly"
          />
          <FeatureItem 
            icon="⚡" 
            title="DAO Governance"
            description="Your tokens = Your voting power"
          />
        </View>

        {/* CTA Button */}
        <TouchableOpacity 
          style={styles.button}
          onPress={handleEnterPlatform}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.electricBlue, COLORS.mediumBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Enter Platform</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>Built on Solana • Demo Version</Text>
      </View>
    </LinearGradient>
  );
}

function FeatureItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 50,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: SPACING.xxl,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.electricBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    shadowColor: COLORS.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: {
    fontSize: 64,
    fontWeight: '900',
    color: COLORS.white,
  },
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.lightGray,
    textAlign: 'center',
  },
  features: {
    gap: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.glassLight,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
  },
  button: {
    marginTop: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    shadowColor: COLORS.electricBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: SPACING.md + 4,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1,
  },
  disclaimer: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.lightGray,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});
