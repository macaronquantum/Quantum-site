import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { COLORS } from '../constants/theme';
import { useWallet } from '../contexts/WalletContext';

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

export default function PhantomCallbackNative() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { connected, setConnectedAddress } = useWallet();
  const [status, setStatus] = useState('Connexion en cours...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If URL listener already connected the wallet, just redirect
    if (connected) {
      console.log('[PhantomCallback] Wallet already connected, redirecting...');
      router.replace('/(tabs)/portfolio');
      return;
    }

    const process = async () => {
      try {
        const errorCode = params.errorCode as string;
        if (errorCode) {
          const errMsg = params.errorMessage
            ? decodeURIComponent(params.errorMessage as string)
            : 'Connexion annulee';
          setError(`Phantom: ${errMsg}`);
          setTimeout(() => router.replace('/(tabs)/profile'), 2000);
          return;
        }

        const phantomPubKey = params.phantom_encryption_public_key as string;
        const nonce = params.nonce as string;
        const data = params.data as string;

        if (!phantomPubKey || !nonce || !data) {
          setError('Parametres Phantom manquants');
          setTimeout(() => router.replace('/(tabs)/profile'), 2000);
          return;
        }

        setStatus('Decryption en cours...');

        const raw = await AsyncStorage.getItem('phantom_pending_keypair');
        if (!raw) {
          setError('Session expiree, veuillez reessayer');
          setTimeout(() => router.replace('/(tabs)/profile'), 2000);
          return;
        }

        await ensureCrypto();
        const keypair = JSON.parse(raw);
        const secretKey = new Uint8Array(keypair.sec);

        const phantomBytes = bs58.decode(phantomPubKey);
        const nonceBytes = bs58.decode(nonce);
        const dataBytes = bs58.decode(data);
        const sharedSecret = nacl.box.before(phantomBytes, secretKey);
        const decrypted = nacl.box.open.after(dataBytes, nonceBytes, sharedSecret);

        if (!decrypted) {
          setError('Echec de la decryption');
          setTimeout(() => router.replace('/(tabs)/profile'), 2000);
          return;
        }

        const payload = JSON.parse(Buffer.from(decrypted).toString('utf8'));
        console.log('[PhantomCallback] public_key:', payload.public_key);

        if (payload.public_key) {
          setStatus('Wallet connecte!');
          setConnectedAddress(payload.public_key);
          await AsyncStorage.removeItem('phantom_pending_keypair');
          setTimeout(() => router.replace('/(tabs)/portfolio'), 1000);
        } else {
          setError('Reponse invalide');
          setTimeout(() => router.replace('/(tabs)/profile'), 2000);
        }
      } catch (err: any) {
        console.error('[PhantomCallback] Error:', err);
        setError(err?.message || 'Erreur inconnue');
        setTimeout(() => router.replace('/(tabs)/profile'), 2000);
      }
    };

    process();
  }, [connected]);

  return (
    <View style={styles.container}>
      {!error ? (
        <>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.status}>{status}</Text>
        </>
      ) : (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Erreur</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.redirect}>Redirection...</Text>
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
    backgroundColor: '#1a0000',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.error,
    maxWidth: 320,
  },
  errorTitle: {
    color: COLORS.error,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    color: '#ff9999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
  redirect: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
});
