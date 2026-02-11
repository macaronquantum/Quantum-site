import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { QUANTUM_PRICE_USD } from '../../utils/solanaRpc';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

export default function Portfolio() {
  const {
    connected,
    address,
    connecting,
    connectWallet,
    disconnectWallet,
    quantumBalance,
    solBalance,
    usdValue,
    eurValue,
    eurRate,
    loadingBalances,
    refreshBalances,
    error,
    clearError,
  } = useWallet();

  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refreshBalances();
    setRefreshing(false);
  }, [refreshBalances]);

  const formatAddress = (addr: string) =>
    `${addr.slice(0, 4)}\u2026${addr.slice(-4)}`;

  const formatNumber = (n: number, decimals = 2) =>
    n.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const copyAddress = async () => {
    if (!address) return;
    try {
      await Clipboard.setStringAsync(address);
      Alert.alert('Copié', 'Adresse wallet copiée dans le presse-papiers');
    } catch {
      Alert.alert('Adresse', address);
    }
  };

  const openPhantom = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open('https://phantom.app/', '_blank');
    } else {
      Linking.openURL('https://phantom.app/');
    }
  };

  const goToPresale = () => {
    router.push('/presale');
  };

  // ─── Not connected ──────────────────────────────────────────
  if (!connected) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={styles.disconnectedScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.disconnectedInner}>
            <View style={styles.walletIconContainer}>
              <Ionicons name="wallet-outline" size={48} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.disconnectedTitle}>Connect Wallet</Text>
            <Text style={styles.disconnectedSubtitle}>
              Connect your Solana wallet to view your real Quantum token balance on mainnet
            </Text>

            {/* Main connect button */}
            <TouchableOpacity
              style={[styles.connectButton, connecting && styles.connectButtonDisabled]}
              onPress={() => { clearError(); connectWallet(); }}
              disabled={connecting}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={connecting ? ['#555', '#444'] : [COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.connectGradient}
              >
                {connecting ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.connectButtonText}>Connecting...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="wallet" size={20} color="#fff" />
                    <Text style={styles.connectButtonText}>Connect Phantom</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Error feedback — inline, always visible */}
            {error === 'NO_WALLET' && (
              <View style={styles.errorCard}>
                <Ionicons name="warning" size={20} color={COLORS.warning} />
                <View style={styles.errorContent}>
                  <Text style={styles.errorTitle}>No Solana Wallet Detected</Text>
                  <Text style={styles.errorText}>
                    Install Phantom or another Solana wallet extension to connect.
                  </Text>
                  <TouchableOpacity style={styles.installButton} onPress={openPhantom} activeOpacity={0.7}>
                    <Ionicons name="download-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.installButtonText}>Install Phantom</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {error === 'PHANTOM_OPENED' && (
              <View style={styles.successCard}>
                <Ionicons name="open-outline" size={20} color={COLORS.success} />
                <View style={styles.errorContent}>
                  <Text style={styles.successTitle}>Phantom Opened</Text>
                  <Text style={styles.errorText}>
                    Approve the connection in Phantom, then return here. The page will update automatically.
                  </Text>
                </View>
              </View>
            )}

            {error && error !== 'NO_WALLET' && error !== 'PHANTOM_OPENED' && (
              <View style={styles.debugErrorCard}>
                <Ionicons name="bug" size={24} color={COLORS.error} />
                <View style={styles.errorContent}>
                  <Text style={styles.debugErrorTitle}>ERREUR DE CONNEXION</Text>
                  <Text style={styles.debugErrorText}>{error}</Text>
                  <TouchableOpacity 
                    style={styles.retryButton} 
                    onPress={() => { clearError(); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.retryButtonText}>Fermer et réessayer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!error && !connecting && (
              <Text style={styles.hint}>Requires Phantom browser extension or mobile app</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Connected ──────────────────────────────────────────────
  const hasTokens = quantumBalance && quantumBalance.amount > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Portfolio</Text>
          <View style={styles.walletChip}>
            <View style={styles.connectedDot} />
            <Text style={styles.walletChipText}>{formatAddress(address!)}</Text>
          </View>
        </View>

        {/* Total Value */}
        <View style={styles.valueCard}>
          {loadingBalances ? (
            <ActivityIndicator color={COLORS.primary} size="large" style={{ marginVertical: SPACING.xl }} />
          ) : (
            <>
              <Text style={styles.valueLabel}>Total Quantum Value</Text>
              <Text style={styles.valueUsd}>${formatNumber(usdValue)}</Text>
              <Text style={styles.valueEur}>
                {'\u2248'} {'\u20ac'}{formatNumber(eurValue)} EUR
                <Text style={styles.rateHint}>{' '}(1 USD = {eurRate.toFixed(4)} EUR)</Text>
              </Text>
              <View style={styles.priceBadge}>
                <Text style={styles.priceBadgeText}>1 QTM = ${QUANTUM_PRICE_USD.toFixed(2)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Quantum Token */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Holdings</Text>
          <View style={styles.tokenCard}>
            <View style={styles.tokenRow}>
              <View style={styles.tokenLogoWrap}>
                <Image source={require('../../assets/images/quantum-logo.png')} style={styles.tokenLogo} resizeMode="cover" />
              </View>
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenName}>Quantum</Text>
                <Text style={styles.tokenMint}>QTM</Text>
              </View>
              <View style={styles.tokenValues}>
                {loadingBalances ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <>
                    <Text style={styles.tokenAmount}>
                      {hasTokens ? formatNumber(quantumBalance!.amount, Math.min(quantumBalance!.decimals, 4)) : '0'}
                    </Text>
                    <Text style={styles.tokenUsd}>${formatNumber(usdValue)}</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          {!hasTokens && !loadingBalances && (
            <View style={styles.noTokenBanner}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.warning} />
              <Text style={styles.noTokenText}>No Quantum tokens detected in this wallet.</Text>
            </View>
          )}
        </View>

        {/* SOL Balance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Network</Text>
          <View style={styles.tokenCard}>
            <View style={styles.tokenRow}>
              <View style={[styles.tokenLogoWrap, { backgroundColor: '#1a1a2e' }]}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#14F195' }}>{'\u25ce'}</Text>
              </View>
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenName}>Solana</Text>
                <Text style={styles.tokenMint}>SOL</Text>
              </View>
              <View style={styles.tokenValues}>
                {loadingBalances ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={styles.tokenAmount}>{formatNumber(solBalance, 4)}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* On-Chain Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>On-Chain</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Network" value="Solana Mainnet" />
            <View style={styles.infoDivider} />
            <InfoRow label="Token Mint" value="4KsZ\u2026ixtLc" />
            <View style={styles.infoDivider} />
            <InfoRow label="Price Source" value="Fixed $2.50 (Pre-TGE)" />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  // Disconnected
  disconnectedScroll: { flexGrow: 1 },
  disconnectedInner: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl },
  walletIconContainer: {
    width: 88, height: 88, borderRadius: 22,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xl,
  },
  disconnectedTitle: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  disconnectedSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xl },
  connectButton: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', width: '100%', maxWidth: 300 },
  connectButtonDisabled: { opacity: 0.7 },
  connectGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 16 },
  connectButtonText: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: '#fff' },
  hint: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, marginTop: SPACING.md, textAlign: 'center' },
  // Error card — inline
  errorCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.warning + '40',
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.base, marginTop: SPACING.lg, width: '100%', maxWidth: 340,
  },
  errorContent: { flex: 1 },
  errorTitle: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: 4 },
  errorText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, lineHeight: 18, marginBottom: SPACING.sm },
  installButton: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.primary + '40',
    borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    alignSelf: 'flex-start',
  },
  installButtonText: { fontSize: FONT_SIZES.xs, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.primary },
  successCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.success + '40',
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.base, marginTop: SPACING.lg, width: '100%', maxWidth: 340,
  },
  successTitle: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.success, marginBottom: 4 },
  // Connected
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  header: { marginBottom: SPACING.lg },
  headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  walletChip: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  connectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  walletChipText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontFamily: 'monospace' },
  valueCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  valueLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  valueUsd: { fontSize: 34, fontWeight: FONT_WEIGHTS.heavy, color: COLORS.textPrimary, marginBottom: 2 },
  valueEur: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  rateHint: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary },
  priceBadge: {
    alignSelf: 'flex-start', marginTop: SPACING.md,
    backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.primary + '40',
    borderRadius: BORDER_RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 4,
  },
  priceBadgeText: { fontSize: FONT_SIZES.xs, color: COLORS.primary, fontWeight: FONT_WEIGHTS.semibold },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, marginBottom: SPACING.md },
  tokenCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  tokenRow: { flexDirection: 'row', alignItems: 'center' },
  tokenLogoWrap: { width: 38, height: 38, borderRadius: 10, overflow: 'hidden', marginRight: SPACING.md, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  tokenLogo: { width: 38, height: 38 },
  tokenInfo: { flex: 1 },
  tokenName: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, marginBottom: 2 },
  tokenMint: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary },
  tokenValues: { alignItems: 'flex-end' },
  tokenAmount: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: 2 },
  tokenUsd: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  noTokenBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.warning + '30',
    borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
  },
  noTokenText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.warning, lineHeight: 18 },
  infoCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md },
  infoLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  infoValue: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary },
  infoDivider: { height: 1, backgroundColor: COLORS.divider },
  // Debug error card for detailed error display
  debugErrorCard: {
    backgroundColor: '#1a0000',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.error,
    marginTop: SPACING.lg,
    width: '100%',
  },
  debugErrorTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.error,
    marginBottom: SPACING.sm,
  },
  debugErrorText: {
    fontSize: FONT_SIZES.sm,
    color: '#ffcccc',
    lineHeight: 20,
    fontFamily: 'monospace',
    marginBottom: SPACING.md,
  },
  retryButton: {
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
  },
});
