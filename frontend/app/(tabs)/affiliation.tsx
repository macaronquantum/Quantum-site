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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
const COMMISSION_PERCENTAGE = 10;

export default function Affiliation() {
  const { address, connected } = useWallet();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (connected && address) {
      fetchReferralData();
    } else {
      setLoading(false);
    }
  }, [address, connected]);

  const fetchReferralData = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/referral/${address}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      Alert.alert('Error', 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (stats?.referralCode) {
      Alert.alert('Copied', `Referral code ${stats.referralCode} copied!`);
    }
  };

  const shareReferralLink = async () => {
    if (!stats?.referralCode) return;
    
    try {
      const referralLink = `https://quantum-ia.com/presale?ref=${stats.referralCode}`;
      await Share.share({
        message: `Join Quantum IA Pre-Sale with my referral code: ${stats.referralCode}\\n\\n${referralLink}`,
        title: 'Quantum IA Referral',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (!connected) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.disconnectedContainer}>
          <Ionicons name="link-outline" size={80} color={COLORS.textTertiary} />
          <Text style={styles.disconnectedTitle}>Connect Wallet</Text>
          <Text style={styles.disconnectedSubtitle}>
            Connect your wallet to access your referral dashboard
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading referral data...</Text>
        </View>
      </View>
    );
  }

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
          <Text style={styles.headerSubtitle}>Earn {COMMISSION_PERCENTAGE}% commission on all referrals</Text>
        </View>

        {/* Referral Card */}
        <View style={styles.referralCard}>
          <View style={styles.referralHeader}>
            <Ionicons name="link-outline" size={24} color={COLORS.primary} />
            <Text style={styles.referralTitle}>Your Referral Code</Text>
          </View>
          
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{stats?.referralCode || 'Loading...'}</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={copyReferralCode}
              disabled={!stats?.referralCode}
            >
              <Ionicons name="copy-outline" size={18} color={COLORS.textPrimary} />
              <Text style={styles.actionButtonText}>Copy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={shareReferralLink}
              disabled={!stats?.referralCode}
            >
              <Ionicons name="share-outline" size={18} color={COLORS.textPrimary} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people-outline" size={24} color={COLORS.textSecondary} />
              <Text style={styles.statValue}>{stats?.referrals || 0}</Text>
              <Text style={styles.statLabel}>Referrals</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="trending-up-outline" size={24} color={COLORS.textSecondary} />
              <Text style={styles.statValue}>{stats?.totalPurchased?.toLocaleString() || 0}</Text>
              <Text style={styles.statLabel}>Tokens</Text>
            </View>
          </View>
        </View>

        {/* Commission */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commission</Text>

          <View style={styles.commissionCard}>
            <View style={styles.commissionRow}>
              <View style={styles.commissionInfo}>
                <Text style={styles.commissionLabel}>Total Earned</Text>
                <Text style={styles.commissionValue}>
                  ${(stats?.commissionEarned || 0).toFixed(2)}
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
                  ${(stats?.commissionPending || 0).toFixed(2)}
                </Text>
              </View>

              <View style={styles.commissionDetailRow}>
                <View style={styles.commissionDetailLabel}>
                  <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
                  <Text style={styles.commissionDetailText}>Paid</Text>
                </View>
                <Text style={styles.commissionDetailValue}>
                  ${(stats?.commissionPaid || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
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
  disconnectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  disconnectedTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  disconnectedSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
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
});
