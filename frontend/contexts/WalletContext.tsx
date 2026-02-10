import 'react-native-get-random-values';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import {
  getQuantumBalance,
  getSolBalance,
  getUsdToEurRate,
  QUANTUM_PRICE_USD,
  TokenBalance,
} from '../utils/solanaRpc';

// ─── Types ──────────────────────────────────────────────────
export interface WalletState {
  connected: boolean;
  address: string | null;
  connecting: boolean;
  // Real on-chain data
  quantumBalance: TokenBalance | null;
  solBalance: number;
  usdValue: number;
  eurValue: number;
  eurRate: number;
  loadingBalances: boolean;
  votingPower: number;
  // Actions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  refreshBalances: () => Promise<void>;
}

const WalletContext = createContext<WalletState>({
  connected: false,
  address: null,
  connecting: false,
  quantumBalance: null,
  solBalance: 0,
  usdValue: 0,
  eurValue: 0,
  eurRate: 0.92,
  loadingBalances: false,
  votingPower: 0,
  connectWallet: async () => {},
  disconnectWallet: async () => {},
  refreshBalances: async () => {},
});

// ─── Phantom browser-extension helper (web) ─────────────────
const getSolanaProvider = (): any | null => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const w = window as any;
    // Standard Solana wallet interface
    if (w.phantom?.solana?.isPhantom) return w.phantom.solana;
    if (w.solana?.isPhantom) return w.solana;
    // Generic Solana provider (Solflare, Backpack, etc.)
    if (w.solana) return w.solana;
  }
  return null;
};

// ─── Provider ───────────────────────────────────────────────
export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // On-chain data
  const [quantumBalance, setQuantumBalance] = useState<TokenBalance | null>(null);
  const [solBalance, setSolBalance] = useState(0);
  const [usdValue, setUsdValue] = useState(0);
  const [eurValue, setEurValue] = useState(0);
  const [eurRate, setEurRate] = useState(0.92);
  const [loadingBalances, setLoadingBalances] = useState(false);

  // Deep-link keypair for Phantom mobile
  const dappKeyPair = useRef(nacl.box.keyPair());
  const sharedSecretRef = useRef<Uint8Array | null>(null);
  const sessionRef = useRef<string | null>(null);

  // ─── Restore session on mount ─────────────────────────────
  useEffect(() => {
    restoreSession();
  }, []);

  // ─── Listen for Phantom deep-link callbacks (mobile) ──────
  useEffect(() => {
    const handleUrl = (event: { url: string }) => handleDeepLink(event.url);
    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    return () => sub.remove();
  }, []);

  // ─── Fetch balances when address changes ──────────────────
  useEffect(() => {
    if (connected && address) {
      refreshBalances();
    } else {
      // Clear on disconnect
      setQuantumBalance(null);
      setSolBalance(0);
      setUsdValue(0);
      setEurValue(0);
    }
  }, [connected, address]);

  // ─── Fetch real on-chain balances ─────────────────────────
  const refreshBalances = useCallback(async () => {
    if (!address) return;
    setLoadingBalances(true);

    try {
      const [qtmBal, sol, rate] = await Promise.all([
        getQuantumBalance(address),
        getSolBalance(address),
        getUsdToEurRate(),
      ]);

      setQuantumBalance(qtmBal);
      setSolBalance(sol);
      setEurRate(rate);

      const usd = qtmBal.amount * QUANTUM_PRICE_USD;
      setUsdValue(usd);
      setEurValue(usd * rate);
    } catch (err) {
      console.error('refreshBalances error:', err);
    } finally {
      setLoadingBalances(false);
    }
  }, [address]);

  // ─── Restore previous session ─────────────────────────────
  const restoreSession = async () => {
    try {
      const storedAddress = await AsyncStorage.getItem('walletAddress');
      if (!storedAddress) return;

      // Web: try silent reconnect via extension
      if (Platform.OS === 'web') {
        const provider = getSolanaProvider();
        if (provider) {
          try {
            const resp = await provider.connect({ onlyIfTrusted: true });
            const addr = resp.publicKey.toString();
            setConnected(true);
            setAddress(addr);
            await AsyncStorage.setItem('walletAddress', addr);
            return;
          } catch {
            // Silent reconnect failed — clear stale session
            await AsyncStorage.removeItem('walletAddress');
            return;
          }
        }
      }

      // Mobile: restore from stored address (balances will be re-fetched)
      setConnected(true);
      setAddress(storedAddress);
    } catch (err) {
      console.error('restoreSession error:', err);
    }
  };

  // ─── Deep-link callback handler (Phantom mobile) ──────────
  const handleDeepLink = async (url: string) => {
    try {
      if (!url) return;
      const parsedUrl = new URL(url);
      const params = parsedUrl.searchParams;

      // Error from Phantom
      const errorCode = params.get('errorCode');
      if (errorCode) {
        const errorMsg = params.get('errorMessage') || 'Connection rejected';
        Alert.alert('Connection Failed', errorMsg);
        setConnecting(false);
        return;
      }

      // Connect response
      if (
        url.includes('onConnect') &&
        params.has('phantom_encryption_public_key')
      ) {
        const phantomPubKey = bs58.decode(params.get('phantom_encryption_public_key')!);
        const nonce = bs58.decode(params.get('nonce')!);
        const encryptedData = bs58.decode(params.get('data')!);

        const sharedSecret = nacl.box.before(
          phantomPubKey,
          dappKeyPair.current.secretKey
        );
        sharedSecretRef.current = sharedSecret;

        const decrypted = nacl.box.open.after(encryptedData, nonce, sharedSecret);
        if (!decrypted) {
          Alert.alert('Error', 'Failed to decrypt wallet response.');
          setConnecting(false);
          return;
        }

        const decoded = JSON.parse(Buffer.from(decrypted).toString('utf8'));
        const walletAddress = decoded.public_key;
        sessionRef.current = decoded.session;

        setConnected(true);
        setAddress(walletAddress);
        setConnecting(false);
        await AsyncStorage.setItem('walletAddress', walletAddress);
      }

      // Disconnect response
      if (url.includes('onDisconnect')) {
        await clearSession();
      }
    } catch (err: any) {
      console.error('Deep-link handler error:', err);
      setConnecting(false);
    }
  };

  // ─── Connect ──────────────────────────────────────────────
  const connectWallet = async () => {
    if (connecting) return;
    setConnecting(true);

    try {
      // ── WEB: use browser extension ──
      if (Platform.OS === 'web') {
        const provider = getSolanaProvider();

        if (provider) {
          try {
            const resp = await provider.connect();
            const addr = resp.publicKey.toString();
            setConnected(true);
            setAddress(addr);
            await AsyncStorage.setItem('walletAddress', addr);
            console.log('Wallet connected:', addr);
          } catch (err: any) {
            if (err?.code === 4001) {
              Alert.alert('Rejected', 'You rejected the connection request.');
            } else {
              Alert.alert('Error', err?.message || 'Connection failed.');
            }
          }
          setConnecting(false);
          return;
        }

        // No Solana wallet detected
        Alert.alert(
          'No Solana Wallet Detected',
          'Please install Phantom or another Solana wallet extension.',
          [
            {
              text: 'Get Phantom',
              onPress: () => {
                if (typeof window !== 'undefined')
                  window.open('https://phantom.app/', '_blank');
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        setConnecting(false);
        return;
      }

      // ── MOBILE: Phantom deep-link ──
      const redirectUri = Linking.createURL('onConnect');
      const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(
          Buffer.from(dappKeyPair.current.publicKey)
        ),
        cluster: 'mainnet-beta',
        app_url: 'https://quantum-ia.com',
        redirect_link: redirectUri,
      });

      const connectUrl = `https://phantom.app/ul/v1/connect?${params.toString()}`;
      const canOpen = await Linking.canOpenURL('phantom://');

      if (canOpen) {
        await Linking.openURL(connectUrl);
        // connecting state stays true until deep-link callback
      } else {
        Alert.alert(
          'Phantom Not Found',
          'Please install the Phantom wallet app.',
          [
            {
              text: 'Install',
              onPress: () =>
                Linking.openURL(
                  Platform.OS === 'ios'
                    ? 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977'
                    : 'https://play.google.com/store/apps/details?id=app.phantom'
                ),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        setConnecting(false);
      }
    } catch (err: any) {
      console.error('connectWallet error:', err);
      Alert.alert('Error', err?.message || 'Failed to connect.');
      setConnecting(false);
    }
  };

  // ─── Disconnect ───────────────────────────────────────────
  const disconnectWallet = async () => {
    try {
      if (Platform.OS === 'web') {
        const provider = getSolanaProvider();
        if (provider) {
          try { await provider.disconnect(); } catch {}
        }
      }
      await clearSession();
    } catch (err) {
      console.error('disconnectWallet error:', err);
      await clearSession();
    }
  };

  const clearSession = async () => {
    setConnected(false);
    setAddress(null);
    setQuantumBalance(null);
    setSolBalance(0);
    setUsdValue(0);
    setEurValue(0);
    sessionRef.current = null;
    sharedSecretRef.current = null;
    await AsyncStorage.multiRemove(['walletAddress', 'phantomSession']);
  };

  return (
    <WalletContext.Provider
      value={{
        connected,
        address,
        connecting,
        quantumBalance,
        solBalance,
        usdValue,
        eurValue,
        eurRate,
        loadingBalances,
        connectWallet,
        disconnectWallet,
        refreshBalances,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
