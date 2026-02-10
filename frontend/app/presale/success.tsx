import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../../constants/theme';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export default function PreSaleSuccess() {
  const router = useRouter();
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    if (session_id) {
      pollPaymentStatus();
    }
  }, [session_id]);

  const pollPaymentStatus = async (attempt = 0) => {
    const maxAttempts = 5;
    
    if (attempt >= maxAttempts) {
      setStatus('error');
      return;
    }

    try {
      const response = await axios.get(`${BACKEND_URL}/api/presale/status/${session_id}`);
      
      if (response.data.payment_status === 'paid') {
        setPaymentData(response.data);
        setStatus('success');
      } else if (response.data.status === 'expired') {
        setStatus('error');
      } else {
        // Continue polling
        setTimeout(() => pollPaymentStatus(attempt + 1), 2000);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      if (attempt < maxAttempts - 1) {
        setTimeout(() => pollPaymentStatus(attempt + 1), 2000);
      } else {
        setStatus('error');
      }
    }
  };

  return (
    <View style={styles.container}>
      {status === 'checking' && (
        <View style={styles.content}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.title}>Confirming Payment...</Text>
          <Text style={styles.subtitle}>Please wait while we verify your transaction</Text>
        </View>
      )}

      {status === 'success' && (
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
          </View>
          <Text style={styles.title}>Payment Successful!</Text>
          <Text style={styles.subtitle}>Your QUANTUM tokens have been reserved</Text>
          
          {paymentData && (
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tokens Purchased:</Text>
                <Text style={styles.detailValue}>{paymentData.metadata?.tokenAmount} QTM</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount Paid:</Text>
                <Text style={styles.detailValue}>${(paymentData.amount_total / 100).toFixed(2)}</Text>
              </View>
            </View>
          )}

          <Text style={styles.info}>
            Tokens will be delivered to your wallet at TGE (Token Generation Event)
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/(tabs)/portfolio')}
          >
            <Text style={styles.buttonText}>Go to Portfolio</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="close-circle" size={80} color={COLORS.error} />
          </View>
          <Text style={styles.title}>Payment Verification Failed</Text>
          <Text style={styles.subtitle}>We couldn't verify your payment. Please contact support.</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/(tabs)/presale')}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  detailLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  info: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  buttonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
});
