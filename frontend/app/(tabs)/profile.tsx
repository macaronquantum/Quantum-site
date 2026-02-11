import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showAlert, showConfirm, copyToClipboard as platformCopy } from '../../utils/platform';
import { QUANTUM_PRICE_USD } from '../../utils/solanaRpc';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  read: boolean;
  created_at: string;
}

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
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => { loadSettings(); }, []);
  
  useEffect(() => {
    if (connected && address) {
      fetchNotifications();
    }
  }, [connected, address]);

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

  const fetchNotifications = async () => {
    if (!address) return;
    try {
      const response = await axios.get(`${BACKEND_URL}/api/notifications/${address}?limit=20`);
      setNotificationsList(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (e) {
      console.error('fetchNotifications:', e);
    }
  };

  const markNotificationsRead = async () => {
    if (!address || unreadCount === 0) return;
    try {
      await axios.post(`${BACKEND_URL}/api/notifications/${address}/mark-read`);
      setUnreadCount(0);
      setNotificationsList(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error('markNotificationsRead:', e);
    }
  };

  const clearAllNotifications = async () => {
    if (!address) return;
    showConfirm(
      'Effacer les notifications',
      'Voulez-vous supprimer toutes les notifications ?',
      async () => {
        try {
          await axios.delete(`${BACKEND_URL}/api/notifications/${address}/clear`);
          setNotificationsList([]);
          setUnreadCount(0);
        } catch (e) {
          console.error('clearAllNotifications:', e);
        }
      },
      'Effacer',
      'Annuler'
    );
  };

  const formatAddr = (a: string) => `${a.slice(0, 6)}\u2026${a.slice(-4)}`;

  const copyAddress = async () => {
    if (!address) return;
    const success = await platformCopy(address);
    if (success) {
      showAlert('Copié', 'Adresse wallet copiée dans le presse-papiers.');
    } else {
      showAlert('Adresse', address);
    }
  };

  const handleDisconnect = () => {
    showConfirm(
      'Déconnecter Wallet',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      disconnectWallet,
      'Déconnecter',
      'Annuler'
    );
  };

  const toggleNetwork = () => {
    const next = network === 'mainnet' ? 'devnet' : 'mainnet';
    setNetwork(next);
    saveSetting('network', next);
    showAlert('Network', `Basculé vers ${next === 'mainnet' ? 'Mainnet' : 'Devnet'}`);
  };

  const toggleNotifications = (value: boolean) => {
    setNotifications(value);
    saveSetting('notifications', value);
    if (value) {
      showAlert('Notifications', 'Les notifications push sont activées.');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ─── Not connected ─────────────────────────────────────────
  if (!connected) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <Ionicons name="person-circle-outline" size={72} color={COLORS.textTertiary} />
          <Text style={styles.centerTitle}>Wallet Non Connecté</Text>
          <Text style={styles.centerSubtitle}>Connectez votre wallet Solana pour gérer votre compte</Text>
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
                <Text style={styles.connectBtnText}>Connecter Wallet</Text>
              </>
            )}
          </TouchableOpacity>
          {error === 'NO_WALLET' && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={16} color={COLORS.warning} />
              <Text style={styles.errorBannerText}>Aucun wallet Solana détecté. Installez Phantom.</Text>
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
        <Text style={styles.pageTitle}>Compte</Text>

        {/* Wallet Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet" size={24} color={COLORS.primary} />
            <TouchableOpacity style={styles.copyBtn} onPress={copyAddress} activeOpacity={0.7}>
              <Ionicons name="copy-outline" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.walletLabel}>Adresse Wallet</Text>
          <Text style={styles.walletAddr}>{formatAddr(address!)}</Text>
        </View>

        {/* Real Balances */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Soldes On-Chain</Text>
          <View style={styles.card}>
            <RowItem label="Quantum (QTM)" value={quantumBalance ? quantumBalance.amount.toLocaleString() : '0'} />
            <View style={styles.divider} />
            <RowItem label="Valeur USD" value={`$${usdValue.toFixed(2)}`} color={COLORS.success} />
            <View style={styles.divider} />
            <RowItem label="Valeur EUR" value={`\u20ac${eurValue.toFixed(2)}`} />
            <View style={styles.divider} />
            <RowItem label="Solde SOL" value={`${solBalance.toFixed(4)} SOL`} />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) {
                markNotificationsRead();
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.sectionTitleRow}>
              <Ionicons name="notifications" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <Ionicons name={showNotifications ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          {showNotifications && (
            <View style={styles.notificationsContainer}>
              {notificationsList.length === 0 ? (
                <View style={styles.emptyNotifications}>
                  <Ionicons name="notifications-off-outline" size={32} color={COLORS.textTertiary} />
                  <Text style={styles.emptyText}>Aucune notification</Text>
                </View>
              ) : (
                <>
                  {notificationsList.map((notif) => (
                    <View key={notif.id} style={[styles.notificationItem, !notif.read && styles.notificationUnread]}>
                      <View style={styles.notificationIcon}>
                        <Ionicons 
                          name={notif.type === 'commission_received' ? 'cash-outline' : 'notifications-outline'} 
                          size={18} 
                          color={notif.type === 'commission_received' ? COLORS.success : COLORS.primary} 
                        />
                      </View>
                      <View style={styles.notificationContent}>
                        <Text style={styles.notificationTitle}>{notif.title}</Text>
                        <Text style={styles.notificationBody}>{notif.body}</Text>
                        <Text style={styles.notificationDate}>{formatDate(notif.created_at)}</Text>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity 
                    style={styles.clearButton}
                    onPress={clearAllNotifications}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                    <Text style={styles.clearButtonText}>Effacer tout</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.settingLabel}>Push Notifications</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={toggleNotifications}
                trackColor={{ false: COLORS.surfaceElevated, true: COLORS.primary + '50' }}
                thumbColor={notifications ? COLORS.primary : COLORS.textTertiary}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="pulse-outline" size={18} color={COLORS.textSecondary} />
                <Text style={styles.settingLabel}>Alertes de Prix</Text>
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
                <Text style={styles.settingLabel}>Réseau</Text>
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
          <Text style={styles.disconnectText}>Déconnecter Wallet</Text>
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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
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
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.warning + '40',
    borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    marginTop: SPACING.lg, maxWidth: 320,
  },
  errorBannerText: { flex: 1, fontSize: FONT_SIZES.xs, color: COLORS.warning, lineHeight: 16 },
  // Notifications styles
  badge: {
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#fff',
  },
  notificationsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  emptyNotifications: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    marginTop: SPACING.sm,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  notificationUnread: {
    backgroundColor: `${COLORS.primary}08`,
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  notificationBody: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  notificationDate: {
    fontSize: 10,
    color: COLORS.textTertiary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  clearButtonText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
    fontWeight: FONT_WEIGHTS.medium,
  },
});
