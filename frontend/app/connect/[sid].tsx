import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { Buffer } from 'buffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../constants/theme';

// API URL
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const WALLET_KEY = 'quantum_wallet';

// Lazy load crypto
let nacl: any = null;
let bs58: any = null;

async function ensureCrypto(): Promise<void> {
  if (!nacl) {
    const m = await import('tweetnacl');
    nacl = m.default || m;
  }
  if (!bs58) {
    const m = await import('bs58');
    bs58 = m.default || m;
  }
}

export default function PhantomCallback() {
  const router = useRouter();
  const { sid } = useLocalSearchParams<{ sid: string }>();
  const [status, setStatus] = useState('Processing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        if (Platform.OS !== 'web' || typeof window === 'undefined') {
          setError('Cette page ne fonctionne que sur web');
          return;
        }

        const params = new URLSearchParams(window.location.search);
        
        // Check for Phantom error
        const errorCode = params.get('errorCode');
        if (errorCode) {
          const errMsg = params.get('errorMessage') || 'Connexion annulée';
          setError(`Phantom erreur (${errorCode}): ${decodeURIComponent(errMsg)}`);
          setTimeout(() => router.replace('/(tabs)/portfolio'), 3000);
          return;
        }

        const phantomPubKey = params.get('phantom_encryption_public_key');
        const nonce = params.get('nonce');
        const data = params.get('data');

        if (!phantomPubKey || !nonce || !data) {
          setError(`Paramètres Phantom manquants`);
          setTimeout(() => router.replace('/(tabs)/portfolio'), 3000);
          return;
        }

        if (!sid) {
          setError('Session ID manquant');
          setTimeout(() => router.replace('/(tabs)/portfolio'), 3000);
          return;
        }

        setStatus('Récupération de la session...');
        
        // Fetch keypair from server
        const response = await fetch(`${API_URL}/api/wallet/session/${sid}`);
        const result = await response.json();

        if (result.error || !result.keypair) {
          setError(`Erreur serveur: ${result.error || 'Session expirée'}`);
          setTimeout(() => router.replace('/(tabs)/portfolio'), 3000);
          return;
        }

        setStatus('Décryption en cours...');
        
        await ensureCrypto();
        
        const keypair = JSON.parse(result.keypair);
        const secretKey = new Uint8Array(keypair.sec);
        const phantomBytes = bs58.decode(phantomPubKey);
        const nonceBytes = bs58.decode(nonce);
        const dataBytes = bs58.decode(data);

        const sharedSecret = nacl.box.before(phantomBytes, secretKey);
        const decrypted = nacl.box.open.after(dataBytes, nonceBytes, sharedSecret);

        if (!decrypted) {
          setError('Échec de la décryption');
          setTimeout(() => router.replace('/(tabs)/portfolio'), 3000);
          return;
        }

        const payload = JSON.parse(Buffer.from(decrypted).toString('utf8'));

        if (!payload.public_key) {
          setError('Réponse Phantom invalide');
          setTimeout(() => router.replace('/(tabs)/portfolio'), 3000);
          return;
        }

        // Save wallet address
        setStatus('Connexion réussie!');
        
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(WALLET_KEY, payload.public_key);
        }
        await AsyncStorage.setItem(WALLET_KEY, payload.public_key);

        // Redirect to portfolio
        setTimeout(() => router.replace('/(tabs)/portfolio'), 1000);

      } catch (err: any) {
        setError(`Erreur: ${err?.message || 'Inconnue'}`);
        setTimeout(() => router.replace('/(tabs)/portfolio'), 3000);
      }
    };

    processCallback();
  }, [sid, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.status}>{status}</Text>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.redirectText}>Redirection...</Text>
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
    padding: 20,
  },
  status: {
    color: COLORS.textPrimary,
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
  },
  errorBox: {
    marginTop: 20,
    backgroundColor: '#1a0000',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  errorText: {
    color: '#ff6666',
    fontSize: 14,
    textAlign: 'center',
  },
  redirectText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
});
