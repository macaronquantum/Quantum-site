import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { Buffer } from 'buffer';
import { COLORS } from '../../constants/theme';
import { useWallet } from '../../contexts/WalletContext';

// API URL
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

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
  const { setConnectedAddress } = useWallet();
  const [status, setStatus] = useState('Traitement en cours...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        if (Platform.OS !== 'web' || typeof window === 'undefined') {
          setError('Cette page ne fonctionne que sur web');
          return;
        }

        console.log('[Callback] Processing with session ID:', sid);
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

        console.log('[Callback] Phantom params:', { 
          hasPubKey: !!phantomPubKey, 
          hasNonce: !!nonce, 
          hasData: !!data 
        });

        if (!phantomPubKey || !nonce || !data) {
          setError('Paramètres Phantom manquants');
          setTimeout(() => router.replace('/(tabs)/portfolio'), 3000);
          return;
        }

        if (!sid) {
          setError('Session ID manquant dans URL');
          setTimeout(() => router.replace('/(tabs)/portfolio'), 3000);
          return;
        }

        setStatus('Récupération de la session...');
        console.log('[Callback] Fetching session from server:', sid);
        
        // Fetch keypair from server
        const response = await fetch(`${API_URL}/api/wallet/session/${sid}`);
        const result = await response.json();

        console.log('[Callback] Server response:', { 
          hasKeypair: !!result.keypair, 
          error: result.error 
        });

        if (result.error || !result.keypair) {
          setError(`Erreur: ${result.error || 'Session expirée ou introuvable'}`);
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

        console.log('[Callback] Decrypting...');
        
        const sharedSecret = nacl.box.before(phantomBytes, secretKey);
        const decrypted = nacl.box.open.after(dataBytes, nonceBytes, sharedSecret);

        if (!decrypted) {
          setError('Échec de la décryption - Les clés ne correspondent pas');
          setTimeout(() => router.replace('/(tabs)/portfolio'), 3000);
          return;
        }

        const payload = JSON.parse(Buffer.from(decrypted).toString('utf8'));
        console.log('[Callback] Decrypted payload:', payload);

        if (!payload.public_key) {
          setError('Réponse Phantom invalide - pas de public_key');
          setTimeout(() => router.replace('/(tabs)/portfolio'), 3000);
          return;
        }

        // SUCCESS! Use context to set connected state
        setStatus('Connexion réussie!');
        console.log('[Callback] SUCCESS! Setting connected address:', payload.public_key);
        
        // This updates the WalletContext state directly
        setConnectedAddress(payload.public_key);

        // Redirect to portfolio after a short delay
        setTimeout(() => {
          router.replace('/(tabs)/portfolio');
        }, 1500);

      } catch (err: any) {
        console.error('[Callback] Error:', err);
        setError(`Erreur technique: ${err?.message || 'Inconnue'}`);
        setTimeout(() => router.replace('/(tabs)/portfolio'), 3000);
      }
    };

    processCallback();
  }, [sid, router, setConnectedAddress]);

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
          <Text style={styles.redirectText}>Redirection en cours...</Text>
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
  redirectText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
});
