import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { useWallet } from '../../contexts/WalletContext';

const COMMISSION_PERCENTAGE = 10; // 10% commission

export default function Affiliation() {
  const { address } = useWallet();
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState({
    referrals: 0,
    totalPurchased: 0,
    commissionEarned: 0,
    commissionPending: 0,
    commissionPaid: 0,
  });

  useEffect(() => {
    loadReferralData();
  }, [address]);

  const loadReferralData = async () => {
    try {
      // Generate referral code from wallet address
      if (address) {
        const code = `QTM${address.slice(0, 6).toUpperCase()}`;
        setReferralCode(code);
      }

      // Load stats from AsyncStorage (mock data for demo)
      const savedStats = await AsyncStorage.getItem('referralStats');
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
    }
  };

  const copyReferralCode = () => {
    // In a real app, use Clipboard API
    Alert.alert('Copied', `Referral code ${referralCode} copied to clipboard!`);
  };

  const shareReferralLink = async () => {
    try {
      const referralLink = `https://quantum-ia.com/presale?ref=${referralCode}`;
      await Share.share({
        message: `Join Quantum IA Pre-Sale with my referral code: ${referralCode}\n\n${referralLink}`,
        title: 'Quantum IA Referral',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const referralLink = `https://quantum-ia.com/presale?ref=${referralCode}`;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Referral Program</Text>
          <Text style={styles.headerSubtitle}>Earn {COMMISSION_PERCENTAGE}% commission on all referral purchases</Text>
        </View>

        {/* Referral Card */}
        <View style={styles.referralCard}>
          <View style={styles.referralHeader}>
            <Ionicons name="link-outline" size={24} color={COLORS.primary} />
            <Text style={styles.referralTitle}>Your Referral Code</Text>
          </View>
          
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{referralCode || 'Connect wallet to get code'}</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={copyReferralCode}
              disabled={!referralCode}
            >
              <Ionicons name="copy-outline" size={18} color={COLORS.textPrimary} />
              <Text style={styles.actionButtonText}>Copy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={shareReferralLink}
              disabled={!referralCode}
            >
              <Ionicons name="share-outline" size={18} color={COLORS.textPrimary} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people-outline" size={24} color={COLORS.textSecondary} />
              <Text style={styles.statValue}>{stats.referrals}</Text>
              <Text style={styles.statLabel}>Referrals</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="trending-up-outline" size={24} color={COLORS.textSecondary} />
              <Text style={styles.statValue}>{stats.totalPurchased.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Tokens Purchased</Text>
            </View>
          </View>
        </View>

        {/* Commission Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commission Breakdown</Text>

          <View style={styles.commissionCard}>
            <View style={styles.commissionRow}>
              <View style={styles.commissionInfo}>
                <Text style={styles.commissionLabel}>Total Earned</Text>
                <Text style={styles.commissionValue}>
                  ${stats.commissionEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.commissionBadge}>
                <Text style={styles.commissionPercentage}>{COMMISSION_PERCENTAGE}%</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.commissionDetail}>
              <View style={styles.commissionDetailRow}>
                <View style={styles.commissionDetailLabel}>
                  <View style={[styles.statusDot, { backgroundColor: COLORS.warning }]} />
                  <Text style={styles.commissionDetailText}>Pending</Text>
                </View>
                <Text style={styles.commissionDetailValue}>
                  ${stats.commissionPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={styles.commissionDetailRow}>
                <View style={styles.commissionDetailLabel}>
                  <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                  <Text style={styles.commissionDetailText}>Paid</Text>
                </View>
                <Text style={styles.commissionDetailValue}>
                  ${stats.commissionPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>

          <View style={styles.howItWorksCard}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Share Your Code</Text>
                <Text style={styles.stepDescription}>
                  Share your unique referral code with potential investors
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>They Purchase</Text>
                <Text style={styles.stepDescription}>
                  When they buy QUANTUM tokens using your code
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Earn Commission</Text>
                <Text style={styles.stepDescription}>
                  You earn {COMMISSION_PERCENTAGE}% commission in QUANTUM or USDC
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.terms}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textTertiary} />
          <Text style={styles.termsText}>
            Commissions are paid monthly. Minimum payout threshold is $100 USD.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  referralCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  referralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  referralTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  codeContainer: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  codeText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  actionButtonPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textPrimary,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginVertical: SPACING.sm,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  commissionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commissionInfo: {
    flex: 1,
  },
  commissionLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  commissionValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  commissionBadge: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  commissionPercentage: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  commissionDetail: {
    gap: SPACING.md,
  },
  commissionDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commissionDetailLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  commissionDetailText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  commissionDetailValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  howItWorksCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
  },
  step: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  stepNumberText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  stepDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  terms: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  termsText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    lineHeight: 18,
  },
});
