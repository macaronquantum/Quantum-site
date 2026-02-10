import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

const QUANTUM_USD_RATE = 2.5;

export default function Portfolio() {
  const { connected, address, connectWallet } = useWallet();

  const quantumBalance = 3500;
  const coQuantumBalance = 250;
  const totalUsdValue = (quantumBalance * QUANTUM_USD_RATE) + (coQuantumBalance * QUANTUM_USD_RATE * 1.5);
  const votingPower = quantumBalance + (coQuantumBalance * 2);

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      Alert.alert('Success', 'Wallet connected successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to connect wallet');
    }
  };

  if (!connected) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.disconnectedContainer}>
          <View style={styles.walletIconContainer}>
            <Ionicons name="wallet-outline" size={64} color={COLORS.textTertiary} />
          </View>
          <Text style={styles.disconnectedTitle}>Connect Wallet</Text>
          <Text style={styles.disconnectedSubtitle}>
            Connect your Solana wallet to view your portfolio and participate in governance
          </Text>
          <TouchableOpacity style={styles.connectButton} onPress={handleConnectWallet}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.connectButtonGradient}
            >
              <Ionicons name="wallet" size={20} color={COLORS.textPrimary} />
              <Text style={styles.connectButtonText}>Connect Wallet</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Portfolio</Text>
          <View style={styles.walletAddress}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
            <Text style={styles.walletAddressText}>{formatAddress(address!)}</Text>
          </View>
        </View>

        {/* Total Value Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Value</Text>
          <Text style={styles.totalValue}>${totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
          <View style={styles.totalChange}>
            <Ionicons name="trending-up" size={16} color={COLORS.success} />
            <Text style={styles.totalChangeText}>+12.4% (24h)</Text>
          </View>
        </View>

        {/* Holdings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Holdings</Text>
          
          <View style={styles.tokenCard}>
            <View style={styles.tokenHeader}>
              <Image source={require('../../assets/images/quantum-logo.png')} style={styles.tokenLogo} resizeMode="contain" />
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenName}>Quantum</Text>
                <Text style={styles.tokenSymbol}>QTM</Text>
              </View>
            </View>
            <View style={styles.tokenFooter}>
              <Text style={styles.tokenAmount}>{quantumBalance.toLocaleString()}</Text>
              <Text style={styles.tokenUsd}>${(quantumBalance * QUANTUM_USD_RATE).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>

          <View style={styles.tokenCard}>
            <View style={styles.tokenHeader}>
              <Image source={require('../../assets/images/quantum-logo.png')} style={[styles.tokenLogo, { opacity: 0.7 }]} resizeMode="contain" />
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenName}>Co-Quantum</Text>
                <Text style={styles.tokenSymbol}>Co-QTM</Text>
              </View>
            </View>
            <View style={styles.tokenFooter}>
              <Text style={styles.tokenAmount}>{coQuantumBalance.toLocaleString()}</Text>
              <Text style={styles.tokenUsd}>${(coQuantumBalance * QUANTUM_USD_RATE * 1.5).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>
        </View>

        {/* Governance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Governance</Text>
          <View style={styles.governanceCard}>
            <View style={styles.governanceRow}>
              <Text style={styles.governanceLabel}>Voting Power</Text>
              <Text style={styles.governanceValue}>{votingPower.toLocaleString()}</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.governanceNote}>1 QTM = 1 vote • 1 Co-QTM = 2 votes</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  disconnectedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  walletIconContainer: { width: 120, height: 120, borderRadius: BORDER_RADIUS.xxl, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xl, ...SHADOWS.subtle },
  disconnectedTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  disconnectedSubtitle: { fontSize: FONT_SIZES.base, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.xxl, lineHeight: 22 },
  connectButton: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.medium },
  connectButtonGradient: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.base, paddingHorizontal: SPACING.xl },
  connectButtonText: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingHorizontal: SPACING.lg },
  header: { marginBottom: SPACING.xl },
  headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  walletAddress: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  walletAddressText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontFamily: 'monospace' },
  totalCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.xl, ...SHADOWS.subtle },
  totalLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  totalValue: { fontSize: FONT_SIZES.huge, fontWeight: FONT_WEIGHTS.heavy, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  totalChange: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  totalChangeText: { fontSize: FONT_SIZES.sm, color: COLORS.success, fontWeight: FONT_WEIGHTS.semibold },
  section: { marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, marginBottom: SPACING.base },
  tokenCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOWS.subtle },
  tokenHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  tokenLogo: { width: 36, height: 36, marginRight: SPACING.md },
  tokenInfo: { flex: 1 },
  tokenName: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, marginBottom: 2 },
  tokenSymbol: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  tokenFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tokenAmount: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  tokenUsd: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  governanceCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, ...SHADOWS.subtle },
  governanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  governanceLabel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  governanceValue: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.primary },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.base },
  governanceNote: { fontSize: FONT_SIZES.sm, color: COLORS.textTertiary, textAlign: 'center' },
});
