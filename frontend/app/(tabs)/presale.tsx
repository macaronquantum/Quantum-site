import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../../contexts/WalletContext';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
const MIN_PURCHASE = 100;

export default function PreSale() {
  const { address } = useWallet();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    walletAddress: address || '',
    tokenAmount: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto'>('card');

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (address) {
      setFormData((prev) => ({ ...prev, walletAddress: address }));
      if (errors.walletAddress) setErrors((prev) => ({ ...prev, walletAddress: '' }));
    }
  }, [address]);

  const fetchConfig = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/config`);
      setConfig(response.data);
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const totalPrice = parseFloat(formData.tokenAmount) * (config?.tokenPrice || 2.5);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'Required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Required';
    if (!formData.walletAddress.trim()) newErrors.walletAddress = 'Wallet address required';
    if (formData.email && !formData.email.includes('@')) newErrors.email = 'Invalid email';
    const tokenAmt = parseInt(formData.tokenAmount);
    if (!formData.tokenAmount || isNaN(tokenAmt) || tokenAmt < MIN_PURCHASE) {
      newErrors.tokenAmount = `Min ${MIN_PURCHASE} tokens`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handlePurchase = async () => {
    if (!validate()) {
      Alert.alert('Form Incomplete', 'Please fill in all required fields correctly.');
      return;
    }

    setLoading(true);

    try {
      const hostUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://governance-fintech.preview.emergentagent.com';

      const purchaseData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        walletAddress: formData.walletAddress,
        tokenAmount: parseInt(formData.tokenAmount),
        paymentMethod: paymentMethod,
        hostUrl: hostUrl,
      };

      const response = await axios.post(`${BACKEND_URL}/api/presale/purchase`, purchaseData);

      if (response.data.success) {
        if (paymentMethod === 'card' && response.data.checkoutUrl) {
          if (typeof window !== 'undefined') {
            window.location.href = response.data.checkoutUrl;
          } else {
            Linking.openURL(response.data.checkoutUrl);
          }
        } else if (paymentMethod === 'crypto' && response.data.solanaAddress) {
          Alert.alert(
            'Crypto Payment',
            `Send $${totalPrice.toFixed(2)} USD in SOL or USDC to:\n\n${response.data.solanaAddress}`,
            [
              { text: 'Copy Address', onPress: () => Alert.alert('Copied', 'Address copied to clipboard') },
              { text: 'OK' },
            ]
          );
          setFormData({ firstName: '', lastName: '', email: '', walletAddress: address || '', tokenAmount: '' });
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to process purchase. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with Logo */}
          <View style={styles.header}>
            <View style={styles.headerLogoWrap}>
              <Image source={require('../../assets/images/quantum-logo.png')} style={styles.headerLogo} resizeMode="cover" />
            </View>
            <Text style={styles.headerTitle}>QUANTUM Pre-Sale</Text>
            <Text style={styles.headerSubtitle}>Secure early allocation at exclusive pricing</Text>
          </View>

          {/* Info Cards */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Token Price</Text>
              <Text style={styles.infoValue}>${config?.tokenPrice || '2.50'}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Min. Purchase</Text>
              <Text style={styles.infoValue}>{MIN_PURCHASE} QTM</Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Purchase Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name *</Text>
              <TextInput
                style={[styles.input, errors.firstName ? styles.inputError : null]}
                value={formData.firstName}
                onChangeText={(t) => updateField('firstName', t)}
                placeholder="John"
                placeholderTextColor={COLORS.textTertiary}
              />
              {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last Name *</Text>
              <TextInput
                style={[styles.input, errors.lastName ? styles.inputError : null]}
                value={formData.lastName}
                onChangeText={(t) => updateField('lastName', t)}
                placeholder="Doe"
                placeholderTextColor={COLORS.textTertiary}
              />
              {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                value={formData.email}
                onChangeText={(t) => updateField('email', t)}
                placeholder="john@example.com"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Solana Wallet *</Text>
              <TextInput
                style={[styles.input, styles.inputMono, errors.walletAddress ? styles.inputError : null]}
                value={formData.walletAddress}
                onChangeText={(t) => updateField('walletAddress', t)}
                placeholder="Enter wallet address"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="none"
              />
              {errors.walletAddress ? <Text style={styles.errorText}>{errors.walletAddress}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>QUANTUM Tokens *</Text>
              <TextInput
                style={[styles.input, errors.tokenAmount ? styles.inputError : null]}
                value={formData.tokenAmount}
                onChangeText={(t) => updateField('tokenAmount', t.replace(/[^0-9]/g, ''))}
                placeholder={`Min ${MIN_PURCHASE}`}
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numeric"
              />
              {errors.tokenAmount ? <Text style={styles.errorText}>{errors.tokenAmount}</Text> : null}
            </View>

            {formData.tokenAmount && !isNaN(totalPrice) && totalPrice > 0 ? (
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              </View>
            ) : null}
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment</Text>
            <View style={styles.paymentMethods}>
              <TouchableOpacity
                style={[styles.paymentMethod, paymentMethod === 'card' && styles.paymentMethodActive]}
                onPress={() => setPaymentMethod('card')}
                activeOpacity={0.7}
              >
                <Ionicons name="card-outline" size={20} color={paymentMethod === 'card' ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[styles.paymentMethodText, paymentMethod === 'card' && styles.paymentMethodTextActive]}>Card</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.paymentMethod, paymentMethod === 'crypto' && styles.paymentMethodActive]}
                onPress={() => setPaymentMethod('crypto')}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-bitcoin" size={20} color={paymentMethod === 'crypto' ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[styles.paymentMethodText, paymentMethod === 'crypto' && styles.paymentMethodTextActive]}>Crypto</Text>
              </TouchableOpacity>
            </View>
            {paymentMethod === 'crypto' ? <Text style={styles.cryptoNote}>Accepted: SOL, USDC on Solana</Text> : null}
          </View>

          {/* Terms */}
          <View style={styles.terms}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.textTertiary} />
            <Text style={styles.termsText}>Tokens delivered at TGE. Purchase is final and non-refundable.</Text>
          </View>

          {/* Button */}
          <TouchableOpacity
            style={[styles.purchaseButton, loading && styles.purchaseButtonDisabled]}
            onPress={handlePurchase}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.purchaseButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.textPrimary} />
              ) : (
                <Text style={styles.purchaseButtonText}>Complete Purchase</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { LinearGradient } from 'expo-linear-gradient';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
  header: { alignItems: 'center', paddingTop: SPACING.lg, marginBottom: SPACING.xl },
  headerLogoWrap: { width: 48, height: 48, borderRadius: 14, overflow: 'hidden', marginBottom: SPACING.md },
  headerLogo: { width: 48, height: 48 },
  headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  headerSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, textAlign: 'center' },
  infoGrid: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.xl },
  infoCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.base, borderWidth: 1, borderColor: COLORS.border },
  infoLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  infoValue: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  section: { marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary, marginBottom: SPACING.base },
  inputGroup: { marginBottom: SPACING.base },
  inputLabel: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
  },
  inputError: { borderColor: COLORS.error },
  inputMono: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  errorText: { fontSize: FONT_SIZES.xs, color: COLORS.error, marginTop: 4 },
  totalCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.base,
    marginTop: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.medium, color: COLORS.textSecondary },
  totalValue: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.primary },
  paymentMethods: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
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
    padding: SPACING.base,
  },
  paymentMethodActive: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceElevated },
  paymentMethodText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.medium, color: COLORS.textSecondary },
  paymentMethodTextActive: { color: COLORS.primary },
  cryptoNote: { fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, textAlign: 'center' },
  terms: { flexDirection: 'row', gap: SPACING.sm, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  termsText: { flex: 1, fontSize: FONT_SIZES.xs, color: COLORS.textTertiary, lineHeight: 16 },
  purchaseButton: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden' },
  purchaseButtonDisabled: { opacity: 0.5 },
  purchaseButtonGradient: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  purchaseButtonText: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.textPrimary },
});
