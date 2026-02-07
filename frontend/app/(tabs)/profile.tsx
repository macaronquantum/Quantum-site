import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';

export default function Profile() {
  const {
    connected,
    address,
    quantumBalance,
    coQuantumBalance,
    disconnectWallet,
    votingPower,
  } = useWallet();

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect your wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: disconnectWallet,
        },
      ]
    );
  };

  if (!connected) {
    return (
      <LinearGradient
        colors={[COLORS.black, COLORS.darkBlue]}
        style={styles.container}
      >
        <StatusBar style="light" />
        <View style={styles.disconnectedContainer}>
          <Ionicons name="person-circle-outline" size={100} color={COLORS.lightGray} />
          <Text style={styles.disconnectedTitle}>No Wallet Connected</Text>
          <Text style={styles.disconnectedSubtitle}>
            Connect your wallet from the Portfolio tab to view your profile
          </Text>
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
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Wallet Card */}
        <LinearGradient
          colors={[COLORS.electricBlue, COLORS.mediumBlue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.walletCard}
        >
          <View style={styles.walletCardHeader}>
            <View style={styles.walletIcon}>
              <Ionicons name="wallet" size={32} color={COLORS.white} />
            </View>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => Alert.alert('Address Copied', formatAddress(address!))}
            >
              <Ionicons name="copy-outline" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.walletLabel}>Wallet Address</Text>
          <Text style={styles.walletAddress}>{formatAddress(address!)}</Text>
        </LinearGradient>

        {/* Holdings Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Token Holdings</Text>
          
          <View style={styles.holdingCard}>
            <View style={styles.holdingRow}>
              <View style={styles.holdingInfo}>
                <View style={styles.tokenIconSmall}>
                  <Text style={styles.tokenIconSmallText}>Q</Text>
                </View>
                <Text style={styles.holdingName}>Quantum</Text>
              </View>
              <Text style={styles.holdingValue}>{formatNumber(quantumBalance)}</Text>
            </View>
          </View>

          <View style={styles.holdingCard}>
            <View style={styles.holdingRow}>
              <View style={styles.holdingInfo}>
                <View style={[styles.tokenIconSmall, { backgroundColor: COLORS.gold }]}>
                  <Text style={styles.tokenIconSmallText}>CQ</Text>
                </View>
                <Text style={styles.holdingName}>Co-Quantum</Text>
              </View>
              <Text style={styles.holdingValue}>{formatNumber(coQuantumBalance)}</Text>
            </View>
          </View>
        </View>

        {/* Governance Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Governance Stats</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="flash" size={32} color={COLORS.electricBlue} />
              <Text style={styles.statValue}>{formatNumber(votingPower)}</Text>
              <Text style={styles.statLabel}>Voting Power</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Votes Cast</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="moon-outline" size={24} color={COLORS.electricBlue} />
              <Text style={styles.settingItemText}>Theme</Text>
            </View>
            <View style={styles.settingItemRight}>
              <Text style={styles.settingItemValue}>Dark</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.lightGray} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="notifications-outline" size={24} color={COLORS.electricBlue} />
              <Text style={styles.settingItemText}>Notifications</Text>
            </View>
            <View style={styles.settingItemRight}>
              <Text style={styles.settingItemValue}>Enabled</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.lightGray} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.electricBlue} />
              <Text style={styles.settingItemText}>Privacy & Security</Text>
            </View>
            <View style={styles.settingItemRight}>
              <Ionicons name="chevron-forward" size={20} color={COLORS.lightGray} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="document-text-outline" size={24} color={COLORS.lightGray} />
              <Text style={styles.settingItemText}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.lightGray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="lock-closed-outline" size={24} color={COLORS.lightGray} />
              <Text style={styles.settingItemText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.lightGray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingItemLeft}>
              <Ionicons name="information-circle-outline" size={24} color={COLORS.lightGray} />
              <Text style={styles.settingItemText}>Disclaimer</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.lightGray} />
          </TouchableOpacity>
        </View>

        {/* Disconnect Button */}
        <TouchableOpacity
          style={styles.disconnectButton}
          onPress={handleDisconnect}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={24} color={COLORS.error} />
          <Text style={styles.disconnectButtonText}>Disconnect Wallet</Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Quantum IA v1.0.0</Text>
          <Text style={styles.appInfoText}>Built on Solana • Demo Version</Text>
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
  disconnectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  disconnectedTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    color: COLORS.white,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  disconnectedSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.lightGray,
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    color: COLORS.white,
  },
  walletCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xl,
  },
  walletCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  walletIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.8,
    marginBottom: SPACING.xs,
  },
  walletAddress: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: 'monospace',
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
  holdingCard: {
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  holdingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holdingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  tokenIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.electricBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenIconSmallText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '900',
    color: COLORS.white,
  },
  holdingName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  holdingValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
    color: COLORS.white,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.lightGray,
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  settingItemText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  settingItemValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.lightGray,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.glassLight,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  disconnectButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.error,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    gap: SPACING.xs,
  },
  appInfoText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.lightGray,
  },
});
