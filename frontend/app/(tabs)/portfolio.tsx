import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  const handleConnect = async () => {
    console.log('Connect button pressed');
    try {
      await connectWallet();
      console.log('Wallet connected successfully');
      Alert.alert('Success', 'Wallet connected!');
    } catch (error) {
      console.error('Connect error:', error);
      Alert.alert('Error', 'Failed to connect wallet');
    }
  };

  if (!connected) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.disconnectedContainer}>
          <View style={styles.walletIconContainer}>
            <Ionicons name="wallet-outline" size={64} color={COLORS.textTertiary} />
          </View>
          <Text style={styles.disconnectedTitle}>Connect Wallet</Text>
          <Text style={styles.disconnectedSubtitle}>Connect your Solana wallet to view portfolio</Text>
          <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
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
            <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
            <Text style={styles.walletAddressText}>{formatAddress(address!)}</Text>
          </View>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Value</Text>
          <Text style={styles.totalValue}>${totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
          <View style={styles.totalChange}>
            <Ionicons name="trending-up" size={14} color={COLORS.success} />
            <Text style={styles.totalChangeText}>+12.4% (24h)</Text>
          </View>
        </View>

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

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  disconnectedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  walletIconContainer: { width: 100, height: 100, borderRadius: BORDER_RADIUS.xxl, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xl },
  disconnectedTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  disconnectedSubtitle: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.normal, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.xxl },
  connectButton: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden' },
  connectButtonGradient: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.base, paddingHorizontal: SPACING.xl },
  connectButtonText: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.base, paddingTop: SPACING.lg, paddingBottom: SPACING.xl },
  header: { marginBottom: SPACING.lg },
  headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  walletAddress: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  walletAddressText: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.normal, color: COLORS.textSecondary, fontFamily: 'monospace' },
  totalCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.lg },
  totalLabel: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.normal, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  totalValue: { fontSize: 32, fontWeight: FONT_WEIGHTS.heavy, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  totalChange: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  totalChangeText: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.success },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, marginBottom: SPACING.md },
  tokenCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  tokenHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  tokenLogo: { width: 32, height: 32, borderRadius: BORDER_RADIUS.lg, marginRight: SPACING.md },
  tokenInfo: { flex: 1 },
  tokenName: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, marginBottom: 2 },
  tokenSymbol: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.normal, color: COLORS.textSecondary },
  tokenFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tokenAmount: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  tokenUsd: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.normal, color: COLORS.textSecondary },
  governanceCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.base },
  governanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  governanceLabel: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.normal, color: COLORS.textSecondary },
  governanceValue: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.primary },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.sm },
  governanceNote: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.normal, color: COLORS.textTertiary, textAlign: 'center' },
});
