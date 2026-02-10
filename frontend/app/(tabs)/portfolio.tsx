import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';

const QUANTUM_USD_RATE = 2.5;

export default function Portfolio() {
  const { connected, address, connectWallet } = useWallet();

  // Mock balances for demo
  const quantumBalance = 3500;
  const coQuantumBalance = 250;
  const quantumUsdValue = quantumBalance * QUANTUM_USD_RATE;
  const coQuantumUsdValue = coQuantumBalance * QUANTUM_USD_RATE * 1.5;
  const totalUsdValue = quantumUsdValue + coQuantumUsdValue;
  const votingPower = quantumBalance + (coQuantumBalance * 2);

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!connected) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.disconnectedContainer}>
          <Ionicons name="wallet-outline" size={80} color={COLORS.textTertiary} />
          <Text style={styles.disconnectedTitle}>Connect Wallet</Text>
          <Text style={styles.disconnectedSubtitle}>
            Connect your Solana wallet to view portfolio
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={connectWallet}
          >
            <Text style={styles.connectButtonText}>Connect Wallet</Text>
          </TouchableOpacity>
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
          <Text style={styles.headerTitle}>Portfolio</Text>
          <View style={styles.walletAddress}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
            <Text style={styles.walletAddressText}>{formatAddress(address!)}</Text>
          </View>
        </View>

        {/* Total Value */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Portfolio Value</Text>
          <Text style={styles.totalValue}>${totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
        </View>

        {/* Token Holdings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Holdings</Text>
          
          {/* Quantum Token */}
          <View style={styles.tokenCard}>
            <View style={styles.tokenHeader}>
              <Image 
                source={require('../../assets/images/quantum-logo.png')}
                style={styles.tokenLogo}
                resizeMode="contain"
              />
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenName}>Quantum</Text>
                <Text style={styles.tokenSymbol}>QTM</Text>
              </View>
            </View>
            <View style={styles.tokenFooter}>
              <Text style={styles.tokenAmount}>{quantumBalance.toLocaleString()}</Text>
              <Text style={styles.tokenUsd}>${quantumUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>

          {/* Co-Quantum Token */}
          <View style={styles.tokenCard}>
            <View style={styles.tokenHeader}>
              <Image 
                source={require('../../assets/images/quantum-logo.png')}
                style={[styles.tokenLogo, { opacity: 0.8 }]}
                resizeMode="contain"
              />
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenName}>Co-Quantum</Text>
                <Text style={styles.tokenSymbol}>Co-QTM</Text>
              </View>
            </View>
            <View style={styles.tokenFooter}>
              <Text style={styles.tokenAmount}>{coQuantumBalance.toLocaleString()}</Text>
              <Text style={styles.tokenUsd}>${coQuantumUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>
        </View>

        {/* Governance Power */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Governance</Text>
          <View style={styles.governanceCard}>
            <View style={styles.governanceRow}>
              <Text style={styles.governanceLabel}>Voting Power</Text>
              <Text style={styles.governanceValue}>{votingPower.toLocaleString()}</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.governanceNote}>
              1 QTM = 1 vote • 1 Co-QTM = 2 votes
            </Text>
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
    marginBottom: SPACING.xl,
  },
  connectButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  connectButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
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
  walletAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  walletAddressText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  totalCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  totalLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  totalValue: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  tokenCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  tokenLogo: {
    width: 32,
    height: 32,
    marginRight: SPACING.md,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  tokenSymbol: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  tokenFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenAmount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  tokenUsd: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  governanceCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
  },
  governanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  governanceLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  governanceValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  governanceNote: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
});
