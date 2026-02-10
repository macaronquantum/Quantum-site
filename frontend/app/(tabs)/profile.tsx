import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';

export default function Profile() {
  const { connected, address, disconnectWallet, connectWallet, connecting } = useWallet();

  const quantumBalance = 3500;
  const coQuantumBalance = 250;
  const votingPower = quantumBalance + coQuantumBalance * 2;

  const [notifications, setNotifications] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(false);
  const [network, setNetwork] = useState<'mainnet' | 'devnet'>('mainnet');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('userSettings');
      if (stored) {
        const s = JSON.parse(stored);
        if (s.notifications !== undefined) setNotifications(s.notifications);
        if (s.priceAlerts !== undefined) setPriceAlerts(s.priceAlerts);
        if (s.network) setNetwork(s.network);
      }
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  };

  const saveSetting = async (key: string, value: any) => {
    try {
      const stored = await AsyncStorage.getItem('userSettings');
      const settings = stored ? JSON.parse(stored) : {};
      settings[key] = value;
      await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving setting:', e);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  const copyAddress = async () => {
    if (!address) return;
    try {
      await Clipboard.setStringAsync(address);
      Alert.alert('Copied', 'Wallet address copied to clipboard');
    } catch {
      Alert.alert('Address', address);
    }
  };

  const handleDisconnect = () => {
    Alert.alert('Disconnect Wallet', 'Are you sure you want to disconnect?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await disconnectWallet();
          Alert.alert('Done', 'Wallet disconnected successfully');
        },
      },
    ]);
  };

  const toggleNetwork = () => {
    const next = network === 'mainnet' ? 'devnet' : 'mainnet';
    setNetwork(next);
    saveSetting('network', next);
    Alert.alert('Network Changed', `Switched to ${next === 'mainnet' ? 'Mainnet' : 'Devnet'}`);
  };

  if (!connected) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.disconnectedContainer}>
          <Ionicons name="person-circle-outline" size={72} color={COLORS.textTertiary} />
          <Text style={styles.disconnectedTitle}>No Wallet Connected</Text>
          <Text style={styles.disconnectedSubtitle}>Connect your Solana wallet to manage your account</Text>
          <TouchableOpacity style={styles.connectBtn} onPress={connectWallet} disabled={connecting} activeOpacity={0.8}>
            <Ionicons name="wallet" size={18} color={COLORS.textPrimary} />
            <Text style={styles.connectBtnText}>{connecting ? 'Connecting...' : 'Connect Wallet'}</Text>
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
          <Text style={styles.headerTitle}>Account</Text>
        </View>

        {/* Wallet Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Ionicons name="wallet" size={28} color={COLORS.primary} />
            <TouchableOpacity style={styles.copyButton} onPress={copyAddress} activeOpacity={0.7}>
              <Ionicons name="copy-outline" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.walletLabel}>Wallet Address</Text>
          <Text style={styles.walletAddress}>{formatAddress(address!)}</Text>
        </View>

        {/* Holdings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Holdings</Text>
          <View style={styles.holdingCard}>
            <View style={styles.holdingRow}>
              <Text style={styles.holdingLabel}>Quantum (QTM)</Text>
              <Text style={styles.holdingValue}>{quantumBalance.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.holdingCard}>
            <View style={styles.holdingRow}>
              <Text style={styles.holdingLabel}>Co-Quantum (Co-QTM)</Text>
              <Text style={styles.holdingValue}>{coQuantumBalance.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.holdingCard}>
            <View style={styles.holdingRow}>
              <Text style={styles.holdingLabel}>Voting Power</Text>
              <Text style={[styles.holdingValue, { color: COLORS.primary }]}>{votingPower.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.settingLabel}>Push Notifications</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={(val) => {
                  setNotifications(val);
                  saveSetting('notifications', val);
                }}
                trackColor={{ false: COLORS.surfaceElevated, true: COLORS.primary + '50' }}
                thumbColor={notifications ? COLORS.primary : COLORS.textTertiary}
              />
            </View>
            <View style={styles.settingDivider} />
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="pulse-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.settingLabel}>Price Alerts</Text>
              </View>
              <Switch
                value={priceAlerts}
                onValueChange={(val) => {
                  setPriceAlerts(val);
                  saveSetting('priceAlerts', val);
                }}
                trackColor={{ false: COLORS.surfaceElevated, true: COLORS.primary + '50' }}
                thumbColor={priceAlerts ? COLORS.primary : COLORS.textTertiary}
              />
            </View>
            <View style={styles.settingDivider} />
            <TouchableOpacity style={styles.settingRow} onPress={toggleNetwork} activeOpacity={0.7}>
              <View style={styles.settingInfo}>
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
        <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.disconnectButtonText}>Disconnect Wallet</Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Quantum IA v1.0.0</Text>
          <Text style={styles.appInfoText}>Built on Solana</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  disconnectedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xxl },
  disconnectedTitle: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  disconnectedSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.xxl, lineHeight: 20 },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
  },
  connectBtnText: { fontSize: FONT_SIZES.base, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: SPACING.lg, paddingHorizontal: SPACING.lg },
  header: { marginBottom: SPACING.xl },
  headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  walletCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.border },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.base },
  copyButton: { width: 36, height: 36, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  walletLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, marginBottom: SPACING.xs },
  walletAddress: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  section: { marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, marginBottom: SPACING.md },
  holdingCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  holdingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  holdingLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  holdingValue: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  settingCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.base, borderWidth: 1, borderColor: COLORS.border },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  settingInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  settingLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
  settingDivider: { height: 1, backgroundColor: COLORS.divider },
  networkBadge: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  networkDot: { width: 8, height: 8, borderRadius: 4 },
  networkText: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.error + '40',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.base,
    marginTop: SPACING.md,
  },
  disconnectButtonText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.error },
  appInfo: { alignItems: 'center', marginTop: SPACING.xl, gap: SPACING.xs },
  appInfoText: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary },
});
