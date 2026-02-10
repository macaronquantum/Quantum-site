import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const QUANTUM_USD_RATE = 2.5;

export default function Portfolio() {
  const { connected, address, connecting, connectWallet } = useWallet();

  const quantumBalance = 3500;
  const coQuantumBalance = 250;
  const totalUsdValue = quantumBalance * QUANTUM_USD_RATE + coQuantumBalance * QUANTUM_USD_RATE * 1.5;
  const votingPower = quantumBalance + coQuantumBalance * 2;

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Connect error:', error);
    }
  };

  if (!connected) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.disconnectedContainer}>
          <View style={styles.walletIconContainer}>
            <Ionicons name="wallet-outline" size={52} color={COLORS.textTertiary} />
          </View>
          <Text style={styles.disconnectedTitle}>Connect Wallet</Text>
          <Text style={styles.disconnectedSubtitle}>
            Connect your Solana wallet to view your portfolio and governance power
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={handleConnect}
            disabled={connecting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.connectButtonGradient}
            >
              {connecting ? (
                <ActivityIndicator color={COLORS.textPrimary} size="small" />
              ) : (
                <>
                  <Ionicons name="wallet" size={20} color={COLORS.textPrimary} />
                  <Text style={styles.connectButtonText}>Connect Phantom</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.walletHint}>Requires Phantom wallet extension</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Portfolio</Text>
          <View style={styles.walletAddress}>
            <View style={styles.connectedDot} />
            <Text style={styles.walletAddressText}>{formatAddress(address!)}</Text>
          </View>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Value</Text>
          <Text style={styles.totalValue}>
            ${totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
          <View style={styles.totalChange}>
            <Ionicons name="trending-up" size={14} color={COLORS.success} />
            <Text style={styles.totalChangeText}>+12.4% (24h)</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Holdings</Text>

          <View style={styles.tokenCard}>
            <View style={styles.tokenHeader}>
              <View style={styles.tokenLogoWrap}>
                <Image source={require('../../assets/images/quantum-logo.png')} style={styles.tokenLogo} resizeMode="cover" />
              </View>
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenName}>Quantum</Text>
                <Text style={styles.tokenSymbol}>QTM</Text>
              </View>
              <View style={styles.tokenValues}>
                <Text style={styles.tokenAmount}>{quantumBalance.toLocaleString()}</Text>
                <Text style={styles.tokenUsd}>${(quantumBalance * QUANTUM_USD_RATE).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              </View>
            </View>
          </View>

          <View style={styles.tokenCard}>
            <View style={styles.tokenHeader}>
              <View style={[styles.tokenLogoWrap, { opacity: 0.7 }]}>
                <Image source={require('../../assets/images/quantum-logo.png')} style={styles.tokenLogo} resizeMode="cover" />
              </View>
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenName}>Co-Quantum</Text>
                <Text style={styles.tokenSymbol}>Co-QTM</Text>
              </View>
              <View style={styles.tokenValues}>
                <Text style={styles.tokenAmount}>{coQuantumBalance.toLocaleString()}</Text>
                <Text style={styles.tokenUsd}>${(coQuantumBalance * QUANTUM_USD_RATE * 1.5).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Governance</Text>
          <View style={styles.governanceCard}>
            <View style={styles.governanceRow}>
              <Text style={styles.governanceLabel}>Voting Power</Text>
              <Text style={styles.governanceValue}>{votingPower.toLocaleString()}</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.governanceNote}>1 QTM = 1 vote  •  1 Co-QTM = 2 votes</Text>
          </View>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  disconnectedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xxl },
  walletIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  disconnectedTitle: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  disconnectedSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.xxl, lineHeight: 20 },
  connectButton: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', width: '100%', maxWidth: 280 },
  connectButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 16, paddingHorizontal: SPACING.xl },
  connectButtonText: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary },
  walletHint: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, marginTop: SPACING.md },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.xl },
  header: { marginBottom: SPACING.lg },
  headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  walletAddress: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  connectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  walletAddressText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontFamily: 'monospace' },
  totalCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  totalLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  totalValue: { fontSize: 34, fontWeight: FONT_WEIGHTS.heavy, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  totalChange: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  totalChangeText: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.success },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, marginBottom: SPACING.md },
  tokenCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  tokenHeader: { flexDirection: 'row', alignItems: 'center' },
  tokenLogoWrap: { width: 36, height: 36, borderRadius: 10, overflow: 'hidden', marginRight: SPACING.md },
  tokenLogo: { width: 36, height: 36 },
  tokenInfo: { flex: 1 },
  tokenName: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, marginBottom: 2 },
  tokenSymbol: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary },
  tokenValues: { alignItems: 'flex-end' },
  tokenAmount: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: 2 },
  tokenUsd: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  governanceCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  governanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  governanceLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  governanceValue: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.primary },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.md },
  governanceNote: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, textAlign: 'center' },
});
