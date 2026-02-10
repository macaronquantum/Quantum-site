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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { QUANTUM_PRICE_USD } from '../../utils/solanaRpc';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Portfolio() {
  const {
    connected,
    address,
    connecting,
    connectWallet,
    quantumBalance,
    solBalance,
    usdValue,
    eurValue,
    eurRate,
    loadingBalances,
    refreshBalances,
  } = useWallet();

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

  // ─── Not connected ──────────────────────────────────────────
  if (!connected) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.disconnectedContainer}>
          <View style={styles.walletIconContainer}>
            <Ionicons name="wallet-outline" size={48} color={COLORS.textTertiary} />
          </View>
          <Text style={styles.disconnectedTitle}>Connect Wallet</Text>
          <Text style={styles.disconnectedSubtitle}>
            Connect your Solana wallet to view your real Quantum token balance
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={connectWallet}
            disabled={connecting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.connectGradient}
            >
              {connecting ? (
                <ActivityIndicator color={COLORS.textPrimary} size="small" />
              ) : (
                <>
                  <Ionicons name="wallet" size={20} color="#fff" />
                  <Text style={styles.connectButtonText}>Connect Phantom</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.hint}>Requires a Solana wallet (Phantom recommended)</Text>
        </View>
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
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
                \u2248 \u20ac{formatNumber(eurValue)} EUR
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
                <Image
                  source={require('../../assets/images/quantum-logo.png')}
                  style={styles.tokenLogo}
                  resizeMode="cover"
                />
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
                      {hasTokens
                        ? formatNumber(quantumBalance!.amount, quantumBalance!.decimals > 4 ? 4 : quantumBalance!.decimals)
                        : '0'}
                    </Text>
                    <Text style={styles.tokenUsd}>
                      ${formatNumber(usdValue)}
                    </Text>
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
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#14F195' }}>\u25ce</Text>
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

        {/* Blockchain Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>On-Chain</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Network" value="Solana Mainnet" />
            <View style={styles.infoDivider} />
            <InfoRow label="Token Mint" value={`4KsZ\u2026ixtLc`} />
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
  disconnectedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xxl },
  walletIconContainer: {
    width: 88, height: 88, borderRadius: 22,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xl,
  },
  disconnectedTitle: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  disconnectedSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xxl },
  connectButton: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', width: '100%', maxWidth: 280 },
  connectGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 16 },
  connectButtonText: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: '#fff' },
  hint: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, marginTop: SPACING.md },
  // Connected
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  header: { marginBottom: SPACING.lg },
  headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  walletChip: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  connectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  walletChipText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontFamily: 'monospace' },
  // Value card
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
  // Sections
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, marginBottom: SPACING.md },
  // Token card
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
  // No tokens
  noTokenBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.warning + '30',
    borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
  },
  noTokenText: { flex: 1, fontSize: FONT_SIZES.sm, color: COLORS.warning, lineHeight: 18 },
  // Info card
  infoCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md },
  infoLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  infoValue: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary },
  infoDivider: { height: 1, backgroundColor: COLORS.divider },
});
