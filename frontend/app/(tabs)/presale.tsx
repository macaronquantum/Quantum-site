import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';

const TOKEN_PRICE = 2.5; // USD per token
const REMAINING_ALLOCATION = 5000000; // tokens
const TOTAL_ALLOCATION = 10000000;

export default function PreSale() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    walletAddress: '',
    tokenAmount: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto'>('card');

  const totalPrice = parseFloat(formData.tokenAmount) * TOKEN_PRICE || 0;
  const allocationPercentage = ((TOTAL_ALLOCATION - REMAINING_ALLOCATION) / TOTAL_ALLOCATION) * 100;

  const handlePurchase = () => {
    if (!formData.firstName || !formData.lastName || !formData.walletAddress || !formData.tokenAmount) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    Alert.alert(
      'Purchase Initiated',
      `Your purchase of ${formData.tokenAmount} QUANTUM tokens (${totalPrice.toFixed(2)} USD) has been initiated.\n\nTokens will be delivered at TGE (Token Generation Event).`,
      [
        { text: 'OK', onPress: () => {
          // Reset form
          setFormData({
            firstName: '',
            lastName: '',
            email: '',
            walletAddress: '',
            tokenAmount: '',
          });
        }}
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>QUANTUM Pre-Sale</Text>
          <Text style={styles.headerSubtitle}>Secure early allocation at exclusive pricing</Text>
        </View>

        {/* Info Cards */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Token Price</Text>
            <Text style={styles.infoValue}>${TOKEN_PRICE}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Min. Purchase</Text>
            <Text style={styles.infoValue}>100 QTM</Text>
          </View>
        </View>

        {/* Allocation Progress */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Allocation Status</Text>
            <Text style={styles.sectionValue}>{allocationPercentage.toFixed(1)}% Sold</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${allocationPercentage}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {REMAINING_ALLOCATION.toLocaleString()} / {TOTAL_ALLOCATION.toLocaleString()} tokens remaining
          </Text>
        </View>

        {/* Purchase Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Purchase Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.firstName}
              onChangeText={(text) => setFormData({ ...formData, firstName: text })}
              placeholder="John"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Last Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.lastName}
              onChangeText={(text) => setFormData({ ...formData, lastName: text })}
              placeholder="Doe"
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="john@example.com"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Solana Wallet Address *</Text>
            <TextInput
              style={[styles.input, styles.inputMono]}
              value={formData.walletAddress}
              onChangeText={(text) => setFormData({ ...formData, walletAddress: text })}
              placeholder="7NF8P..."
              placeholderTextColor={COLORS.textTertiary}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Number of QUANTUM Tokens *</Text>
            <TextInput
              style={styles.input}
              value={formData.tokenAmount}
              onChangeText={(text) => setFormData({ ...formData, tokenAmount: text.replace(/[^0-9]/g, '') })}
              placeholder="1000"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="numeric"
            />
          </View>

          {/* Calculated Total */}
          {formData.tokenAmount && (
            <View style={styles.totalCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          <View style={styles.paymentMethods}>
            <TouchableOpacity
              style={[
                styles.paymentMethod,
                paymentMethod === 'card' && styles.paymentMethodActive,
              ]}
              onPress={() => setPaymentMethod('card')}
            >
              <Ionicons
                name="card-outline"
                size={24}
                color={paymentMethod === 'card' ? COLORS.primary : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.paymentMethodText,
                  paymentMethod === 'card' && styles.paymentMethodTextActive,
                ]}
              >
                Card
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentMethod,
                paymentMethod === 'crypto' && styles.paymentMethodActive,
              ]}
              onPress={() => setPaymentMethod('crypto')}
            >
              <Ionicons
                name="logo-bitcoin"
                size={24}
                color={paymentMethod === 'crypto' ? COLORS.primary : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.paymentMethodText,
                  paymentMethod === 'crypto' && styles.paymentMethodTextActive,
                ]}
              >
                Crypto
              </Text>
            </TouchableOpacity>
          </View>

          {paymentMethod === 'crypto' && (
            <Text style={styles.cryptoNote}>Accepted: USDC, SOL, USDT</Text>
          )}
        </View>

        {/* Terms */}
        <View style={styles.terms}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textTertiary} />
          <Text style={styles.termsText}>
            Tokens will be distributed at TGE (Token Generation Event). Purchase is final and non-refundable.
          </Text>
        </View>

        {/* Purchase Button */}
        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={handlePurchase}
          activeOpacity={0.8}
        >
          <Text style={styles.purchaseButtonText}>Complete Purchase</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.xl,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  infoValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  sectionValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.primary,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  inputMono: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  totalCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
  },
  totalValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  paymentMethod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
  },
  paymentMethodActive: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.primary,
  },
  paymentMethodText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
  },
  paymentMethodTextActive: {
    color: COLORS.primary,
  },
  cryptoNote: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  terms: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  termsText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    lineHeight: 18,
  },
  purchaseButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  purchaseButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
});
