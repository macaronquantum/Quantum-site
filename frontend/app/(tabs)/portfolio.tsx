import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');
const QUANTUM_USD_RATE = 2.5;

export default function Portfolio() {
  const {
    connected,
    address,
    quantumBalance,
    coQuantumBalance,
    connectWallet,
    votingPower,
  } = useWallet();

  const quantumUsdValue = quantumBalance * QUANTUM_USD_RATE;
  const coQuantumUsdValue = coQuantumBalance * QUANTUM_USD_RATE * 1.5; // Co-tokens worth 1.5x
  const totalUsdValue = quantumUsdValue + coQuantumUsdValue;

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (!connected) {
    return (
      <LinearGradient
        colors={[COLORS.black, COLORS.darkBlue]}
        style={styles.container}
      >
        <StatusBar style="light" />
        <View style={styles.disconnectedContainer}>
          <View style={styles.walletIconContainer}>
            <Ionicons name="wallet-outline" size={80} color={COLORS.electricBlue} />
          </View>
          <Text style={styles.disconnectedTitle}>Connect Your Wallet</Text>
          <Text style={styles.disconnectedSubtitle}>
            Connect your Solana wallet to view your portfolio and participate in DAO governance
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={connectWallet}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.electricBlue, COLORS.mediumBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.connectButtonGradient}
            >
              <Ionicons name="wallet" size={24} color={COLORS.white} />
              <Text style={styles.connectButtonText}>Connect Wallet</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[COLORS.black, COLORS.darkBlue]}
      style={styles.container}
    >
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Portfolio</Text>
          <TouchableOpacity style={styles.walletAddress}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
            <Text style={styles.walletAddressText}>{formatAddress(address!)}</Text>
          </TouchableOpacity>
        </View>

        {/* Total Value Card */}
        <LinearGradient
          colors={[COLORS.electricBlue, COLORS.mediumBlue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.totalValueCard}
        >
          <Text style={styles.totalValueLabel}>Total Portfolio Value</Text>
          <Text style={styles.totalValueAmount}>{formatCurrency(totalUsdValue)}</Text>
          <View style={styles.totalValueDetails}>
            <View style={styles.totalValueDetail}>
              <Ionicons name="trending-up" size={16} color={COLORS.white} />
              <Text style={styles.totalValueDetailText}>+12.5% (24h)</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Token Holdings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Token Holdings</Text>
          
          {/* Quantum Token Card */}
          <View style={styles.tokenCard}>
            <View style={styles.tokenHeader}>
              <View style={styles.tokenIcon}>
                <Text style={styles.tokenIconText}>Q</Text>
              </View>
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenName}>Quantum</Text>
                <Text style={styles.tokenSymbol}>QUANTUM</Text>
              </View>
              <View style={styles.tokenValues}>
                <Text style={styles.tokenAmount}>{formatNumber(quantumBalance)}</Text>
                <Text style={styles.tokenUsd}>{formatCurrency(quantumUsdValue)}</Text>
              </View>
            </View>
            <View style={styles.tokenFooter}>
              <Text style={styles.tokenRate}>${QUANTUM_USD_RATE.toFixed(2)} per token</Text>
              <View style={styles.tokenChange}>
                <Ionicons name="arrow-up" size={12} color={COLORS.success} />
                <Text style={styles.tokenChangeText}>+8.2%</Text>
              </View>
            </View>
          </View>

          {/* Co-Quantum Token Card */}
          <View style={styles.tokenCard}>
            <View style={styles.tokenHeader}>
              <View style={[styles.tokenIcon, { backgroundColor: COLORS.gold }]}>
                <Text style={styles.tokenIconText}>CQ</Text>
              </View>
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenName}>Co-Quantum</Text>
                <Text style={styles.tokenSymbol}>CO-QUANTUM</Text>
              </View>
              <View style={styles.tokenValues}>
                <Text style={styles.tokenAmount}>{formatNumber(coQuantumBalance)}</Text>
                <Text style={styles.tokenUsd}>{formatCurrency(coQuantumUsdValue)}</Text>
              </View>
            </View>
            <View style={styles.tokenFooter}>
              <Text style={styles.tokenRate}>${(QUANTUM_USD_RATE * 1.5).toFixed(2)} per token</Text>
              <View style={styles.tokenChange}>
                <Ionicons name="arrow-up" size={12} color={COLORS.success} />
                <Text style={styles.tokenChangeText}>+15.7%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Governance Power */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Governance Power</Text>
          <View style={styles.governanceCard}>
            <View style={styles.governanceRow}>
              <Text style={styles.governanceLabel}>Your Voting Power</Text>
              <Text style={styles.governanceValue}>{formatNumber(votingPower)}</Text>
            </View>
            <View style={styles.governanceDivider} />
            <Text style={styles.governanceExplainer}>
              1 Quantum = 1 vote • 1 Co-Quantum = 2 votes
            </Text>
            <View style={styles.governanceBreakdown}>
              <View style={styles.governanceBreakdownItem}>
                <View style={styles.governanceBreakdownDot} />
                <Text style={styles.governanceBreakdownText}>
                  {formatNumber(quantumBalance)} from Quantum
                </Text>
              </View>
              <View style={styles.governanceBreakdownItem}>
                <View style={[styles.governanceBreakdownDot, { backgroundColor: COLORS.gold }]} />
                <Text style={styles.governanceBreakdownText}>
                  {formatNumber(coQuantumBalance * 2)} from Co-Quantum
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
  },
  // Disconnected State
  disconnectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  walletIconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.glassLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  disconnectedTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  disconnectedSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.lightGray,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  connectButton: {
    width: '100%',
    maxWidth: 300,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    shadowColor: COLORS.electricBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  connectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md + 4,
    gap: SPACING.sm,
  },
  connectButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Connected State
  header: {
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  walletAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  walletAddressText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
    fontFamily: 'monospace',
  },
  totalValueCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xl,
    shadowColor: COLORS.electricBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  totalValueLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.8,
    marginBottom: SPACING.xs,
  },
  totalValueAmount: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  totalValueDetails: {
    flexDirection: 'row',
  },
  totalValueDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalValueDetailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    fontWeight: '600',
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  tokenCard: {
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tokenIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.electricBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  tokenIconText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '900',
    color: COLORS.white,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  tokenSymbol: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.lightGray,
  },
  tokenValues: {
    alignItems: 'flex-end',
  },
  tokenAmount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  tokenUsd: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
  },
  tokenFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tokenRate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.lightGray,
  },
  tokenChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tokenChangeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    fontWeight: '600',
  },
  governanceCard: {
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
  },
  governanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  governanceLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.lightGray,
  },
  governanceValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    color: COLORS.electricBlue,
  },
  governanceDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  governanceExplainer: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  governanceBreakdown: {
    gap: SPACING.sm,
  },
  governanceBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  governanceBreakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.electricBlue,
  },
  governanceBreakdownText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
  },
});
