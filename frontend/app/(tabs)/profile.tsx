import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';

export default function Profile() {
  const { connected, address, disconnectWallet } = useWallet();

  const quantumBalance = 3500;
  const coQuantumBalance = 250;
  const votingPower = quantumBalance + (coQuantumBalance * 2);

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
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
          onPress: async () => {
            await disconnectWallet();
            Alert.alert('Success', 'Wallet disconnected');
          },
        },
      ]
    );
  };

  if (!connected) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.disconnectedContainer}>
          <Ionicons name="person-circle-outline" size={80} color={COLORS.textTertiary} />
          <Text style={styles.disconnectedTitle}>No Wallet Connected</Text>
          <Text style={styles.disconnectedSubtitle}>
            Connect your wallet from the Portfolio tab
          </Text>
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account</Text>
        </View>

        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Ionicons name="wallet" size={32} color={COLORS.primary} />
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => Alert.alert('Address Copied', formatAddress(address!))}
            >
              <Ionicons name="copy-outline" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.walletLabel}>Wallet Address</Text>
          <Text style={styles.walletAddress}>{formatAddress(address!)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Holdings</Text>
          
          <View style={styles.holdingCard}>
            <View style={styles.holdingRow}>
              <Text style={styles.holdingLabel}>Quantum</Text>
              <Text style={styles.holdingValue}>{quantumBalance.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.holdingCard}>
            <View style={styles.holdingRow}>
              <Text style={styles.holdingLabel}>Co-Quantum</Text>
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

        <TouchableOpacity
          style={styles.disconnectButton}
          onPress={handleDisconnect}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.disconnectButtonText}>Disconnect Wallet</Text>
        </TouchableOpacity>

        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Quantum IA v1.0.0</Text>
          <Text style={styles.appInfoText}>Built on Solana</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  disconnectedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  disconnectedTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  disconnectedSubtitle: { fontSize: FONT_SIZES.base, color: COLORS.textSecondary, textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingHorizontal: SPACING.lg },
  header: { marginBottom: SPACING.xl },
  headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  walletCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.xl, ...SHADOWS.subtle },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.base },
  copyButton: { width: 36, height: 36, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  walletLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  walletAddress: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, fontFamily: 'monospace' },
  section: { marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, marginBottom: SPACING.base },
  holdingCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.base, marginBottom: SPACING.md, ...SHADOWS.subtle },
  holdingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  holdingLabel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  holdingValue: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  disconnectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.error, borderRadius: BORDER_RADIUS.lg, padding: SPACING.base, marginTop: SPACING.lg, ...SHADOWS.subtle },
  disconnectButtonText: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.error },
  appInfo: { alignItems: 'center', marginTop: SPACING.xl, gap: SPACING.xs },
  appInfoText: { fontSize: FONT_SIZES.sm, color: COLORS.textTertiary },
});
