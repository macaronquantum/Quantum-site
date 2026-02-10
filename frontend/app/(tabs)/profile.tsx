import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { QUANTUM_PRICE_USD } from '../../utils/solanaRpc';

export default function Profile() {
  const {
    connected,
    address,
    connecting,
    disconnectWallet,
    connectWallet,
    quantumBalance,
    solBalance,
    usdValue,
    eurValue,
    error,
    clearError,
  } = useWallet();

  const [notifications, setNotifications] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(false);
  const [network, setNetwork] = useState<'mainnet' | 'devnet'>('mainnet');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('userSettings');
      if (stored) {
        const s = JSON.parse(stored);
        if (s.notifications !== undefined) setNotifications(s.notifications);
        if (s.priceAlerts !== undefined) setPriceAlerts(s.priceAlerts);
        if (s.network) setNetwork(s.network);
      }
    } catch (e) { console.error('loadSettings:', e); }
  };

  const saveSetting = async (key: string, value: any) => {
    try {
      const stored = await AsyncStorage.getItem('userSettings');
      const settings = stored ? JSON.parse(stored) : {};
      settings[key] = value;
      await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
    } catch (e) { console.error('saveSetting:', e); }
  };

  const formatAddr = (a: string) => `${a.slice(0, 6)}\u2026${a.slice(-4)}`;

  const copyAddress = async () => {
    if (!address) return;
    try {
      await Clipboard.setStringAsync(address);
      Alert.alert('Copied', 'Full wallet address copied to clipboard.');
    } catch { Alert.alert('Address', address); }
  };

  const handleDisconnect = () => {
    Alert.alert('Disconnect Wallet', 'Are you sure you want to disconnect?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: disconnectWallet },
    ]);
  };

  const toggleNetwork = () => {
    const next = network === 'mainnet' ? 'devnet' : 'mainnet';
    setNetwork(next);
    saveSetting('network', next);
    Alert.alert('Network', `Switched to ${next === 'mainnet' ? 'Mainnet' : 'Devnet'}`);
  };

  // ─── Not connected ─────────────────────────────────────────
  if (!connected) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <Ionicons name="person-circle-outline" size={72} color={COLORS.textTertiary} />
          <Text style={styles.centerTitle}>No Wallet Connected</Text>
          <Text style={styles.centerSubtitle}>Connect your Solana wallet to manage your account</Text>
          <TouchableOpacity
            style={[styles.connectBtn, connecting && { opacity: 0.6 }]}
            onPress={() => { clearError(); connectWallet(); }}
            disabled={connecting}
            activeOpacity={0.7}
          >
            {connecting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="wallet" size={18} color="#fff" />
                <Text style={styles.connectBtnText}>Connect Wallet</Text>
              </>
            )}
          </TouchableOpacity>
          {error === 'NO_WALLET' && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={16} color={COLORS.warning} />
              <Text style={styles.errorBannerText}>No Solana wallet detected. Install Phantom.</Text>
            </View>
          )}
          {error && error !== 'NO_WALLET' && (
            <View style={styles.errorBanner}>
              <Ionicons name="close-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ─── Connected ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Account</Text>

        {/* Wallet Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet" size={24} color={COLORS.primary} />
            <TouchableOpacity style={styles.copyBtn} onPress={copyAddress} activeOpacity={0.7}>
              <Ionicons name="copy-outline" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.walletLabel}>Wallet Address</Text>
          <Text style={styles.walletAddr}>{formatAddr(address!)}</Text>
        </View>

        {/* Real Balances */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>On-Chain Balances</Text>
          <View style={styles.card}>
            <RowItem label="Quantum (QTM)" value={quantumBalance ? quantumBalance.amount.toLocaleString() : '0'} />
            <View style={styles.divider} />
            <RowItem label="USD Value" value={`$${usdValue.toFixed(2)}`} color={COLORS.success} />
            <View style={styles.divider} />
            <RowItem label="EUR Value" value={`\u20ac${eurValue.toFixed(2)}`} />
            <View style={styles.divider} />
            <RowItem label="SOL Balance" value={`${solBalance.toFixed(4)} SOL`} />
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.settingLabel}>Push Notifications</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={(v) => { setNotifications(v); saveSetting('notifications', v); }}
                trackColor={{ false: COLORS.surfaceElevated, true: COLORS.primary + '50' }}
                thumbColor={notifications ? COLORS.primary : COLORS.textTertiary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="pulse-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.settingLabel}>Price Alerts</Text>
              </View>
              <Switch
                value={priceAlerts}
                onValueChange={(v) => { setPriceAlerts(v); saveSetting('priceAlerts', v); }}
                trackColor={{ false: COLORS.surfaceElevated, true: COLORS.primary + '50' }}
                thumbColor={priceAlerts ? COLORS.primary : COLORS.textTertiary}
              />
            </View>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow} onPress={toggleNetwork} activeOpacity={0.7}>
              <View style={styles.settingLeft}>
                <Ionicons name="globe-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.settingLabel}>Network</Text>
              </View>
              <View style={styles.networkBadge}>
                <View style={[styles.networkDot, { backgroundColor: network === 'mainnet' ? COLORS.success : COLORS.warning }]} />
                <Text style={styles.networkText}>{network === 'mainnet' ? 'Mainnet' : 'Devnet'}</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.textTertiary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Disconnect */}
        <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.disconnectText}>Disconnect Wallet</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Quantum IA v1.0.0</Text>
          <Text style={styles.footerText}>Solana Mainnet-Beta</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function RowItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.rowItem}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xxl },
  centerTitle: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  centerSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xxl },
  connectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 14, paddingHorizontal: SPACING.xl,
  },
  connectBtnText: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: '#fff' },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: SPACING.lg, paddingHorizontal: SPACING.lg },
  pageTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xl },
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.base, paddingVertical: SPACING.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  copyBtn: { width: 36, height: 36, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  walletLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, marginBottom: SPACING.xs },
  walletAddr: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  section: { marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, marginBottom: SPACING.md },
  divider: { height: 1, backgroundColor: COLORS.divider },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  rowLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  rowValue: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  settingLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
  networkBadge: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  networkDot: { width: 8, height: 8, borderRadius: 4 },
  networkText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  disconnectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.error + '40',
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.base, marginTop: SPACING.md,
  },
  disconnectText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.error },
  footer: { alignItems: 'center', marginTop: SPACING.xl, gap: SPACING.xs },
  footerText: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary },
});
