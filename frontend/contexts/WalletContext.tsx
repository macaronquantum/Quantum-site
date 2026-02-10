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
import { Platform } from 'react-native';
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
  quantumBalance: TokenBalance | null;
  solBalance: number;
  usdValue: number;
  eurValue: number;
  eurRate: number;
  loadingBalances: boolean;
  votingPower: number;
  error: string | null;
  clearError: () => void;
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
  error: null,
  clearError: () => {},
  connectWallet: async () => {},
  disconnectWallet: async () => {},
  refreshBalances: async () => {},
});

// ─── Solana wallet extension (web only) ─────────────────────
const getSolanaProvider = (): any | null => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const w = window as any;
    if (w.phantom?.solana?.isPhantom) return w.phantom.solana;
    if (w.solana?.isPhantom) return w.solana;
    if (w.solana) return w.solana;
  }
  return null;
};

// ─── Keypair persistence helpers ─────────────────────────────
const STORAGE_KEYS = {
  SECRET_KEY: 'phantom_dapp_secret_key',
  PUBLIC_KEY: 'phantom_dapp_public_key',
  WALLET_ADDRESS: 'walletAddress',
  SESSION: 'phantomSession',
};

async function saveKeypair(kp: { publicKey: Uint8Array; secretKey: Uint8Array }) {
  await AsyncStorage.setItem(STORAGE_KEYS.SECRET_KEY, bs58.encode(Buffer.from(kp.secretKey)));
  await AsyncStorage.setItem(STORAGE_KEYS.PUBLIC_KEY, bs58.encode(Buffer.from(kp.publicKey)));
}

async function loadSecretKey(): Promise<Uint8Array | null> {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.SECRET_KEY);
  if (!stored) return null;
  try {
    return new Uint8Array(bs58.decode(stored));
  } catch {
    return null;
  }
}

// ─── Provider ───────────────────────────────────────────────
export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [quantumBalance, setQuantumBalance] = useState<TokenBalance | null>(null);
  const [solBalance, setSolBalance] = useState(0);
  const [usdValue, setUsdValue] = useState(0);
  const [eurValue, setEurValue] = useState(0);
  const [eurRate, setEurRate] = useState(0.92);
  const [loadingBalances, setLoadingBalances] = useState(false);

  // Generate keypair once; will be persisted to AsyncStorage before use
  const dappKeyPair = useRef(nacl.box.keyPair());
  const sharedSecretRef = useRef<Uint8Array | null>(null);
  const sessionRef = useRef<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // ─── Init: restore session + check for Phantom callback ────
  useEffect(() => {
    initWallet();
  }, []);

  const initWallet = async () => {
    // First: check if we're returning from a Phantom redirect (web)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const url = window.location.href;
      if (url.includes('phantom_encryption_public_key') || url.includes('errorCode')) {
        await handlePhantomCallback(url);
        return; // Don't restore old session, we're handling a new connection
      }
    }
    // Otherwise: try to restore previous session
    await restoreSession();
  };

  // ─── Listen for deep-link callbacks (mobile Expo Go) ───────
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      if (event.url) handlePhantomCallback(event.url);
    };
    const sub = Linking.addEventListener('url', handleUrl);
    // Also check initial URL
    Linking.getInitialURL().then((url) => {
      if (url && (url.includes('phantom_encryption_public_key') || url.includes('onConnect'))) {
        handlePhantomCallback(url);
      }
    });
    return () => sub.remove();
  }, []);

  // ─── Fetch balances when connected ─────────────────────────
  useEffect(() => {
    if (connected && address) {
      refreshBalances();
    } else {
      setQuantumBalance(null);
      setSolBalance(0);
      setUsdValue(0);
      setEurValue(0);
    }
  }, [connected, address]);

  // ─── Fetch real on-chain data ──────────────────────────────
  const refreshBalances = useCallback(async () => {
    if (!address) return;
    setLoadingBalances(true);
    setError(null);

    try {
      console.log('Fetching on-chain data for:', address);
      const [qtmBal, sol, rate] = await Promise.all([
        getQuantumBalance(address),
        getSolBalance(address),
        getUsdToEurRate(),
      ]);

      console.log('Quantum balance:', qtmBal.amount, 'SOL:', sol, 'EUR rate:', rate);

      setQuantumBalance(qtmBal);
      setSolBalance(sol);
      setEurRate(rate);

      const usd = qtmBal.amount * QUANTUM_PRICE_USD;
      setUsdValue(usd);
      setEurValue(usd * rate);
    } catch (err: any) {
      console.error('refreshBalances error:', err);
      // Don't set error here — the wallet IS connected, just the RPC might be slow
    } finally {
      setLoadingBalances(false);
    }
  }, [address]);

  // ─── Handle Phantom callback (both web redirect & mobile deep-link) ──
  const handlePhantomCallback = async (url: string) => {
    try {
      console.log('Phantom callback URL:', url.substring(0, 100));

      const parsedUrl = new URL(url);
      const params = parsedUrl.searchParams;

      // Clean URL on web
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const cleanUrl = parsedUrl.origin + parsedUrl.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }

      // Check for errors from Phantom
      const errorCode = params.get('errorCode');
      if (errorCode) {
        setError(params.get('errorMessage') || 'Connection rejected by user.');
        setConnecting(false);
        return;
      }

      const phantomPubKeyStr = params.get('phantom_encryption_public_key');
      const nonceStr = params.get('nonce');
      const dataStr = params.get('data');

      if (!phantomPubKeyStr || !nonceStr || !dataStr) {
        console.log('No Phantom connect params found in URL');
        return;
      }

      // Load the SECRET KEY we saved BEFORE redirecting to Phantom
      const storedSecretKey = await loadSecretKey();

      // Also try the in-memory keypair as fallback
      const secretKeyToUse = storedSecretKey || dappKeyPair.current.secretKey;

      if (!secretKeyToUse) {
        setError('Session expired. Please try connecting again.');
        setConnecting(false);
        return;
      }

      console.log('Decrypting Phantom response...');

      const phantomPubKey = bs58.decode(phantomPubKeyStr);
      const nonce = bs58.decode(nonceStr);
      const encryptedData = bs58.decode(dataStr);

      // Derive shared secret
      const sharedSecret = nacl.box.before(phantomPubKey, secretKeyToUse);
      sharedSecretRef.current = sharedSecret;

      // Decrypt
      const decrypted = nacl.box.open.after(encryptedData, nonce, sharedSecret);
      if (!decrypted) {
        setError('Decryption failed. Please try connecting again.');
        setConnecting(false);
        return;
      }

      const decoded = JSON.parse(Buffer.from(decrypted).toString('utf8'));
      const walletAddress = decoded.public_key;
      sessionRef.current = decoded.session;

      console.log('Wallet connected successfully:', walletAddress);

      setConnected(true);
      setAddress(walletAddress);
      setConnecting(false);
      setError(null);
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, walletAddress);
      if (decoded.session) {
        await AsyncStorage.setItem(STORAGE_KEYS.SESSION, decoded.session);
      }
    } catch (err: any) {
      console.error('Phantom callback error:', err?.message || err);
      setError('Connection failed: ' + (err?.message || 'Unknown error'));
      setConnecting(false);
    }
  };

  // ─── Restore previous session ──────────────────────────────
  const restoreSession = async () => {
    try {
      const storedAddress = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);
      if (!storedAddress) return;

      if (Platform.OS === 'web') {
        const provider = getSolanaProvider();
        if (provider) {
          try {
            const resp = await provider.connect({ onlyIfTrusted: true });
            const addr = resp.publicKey.toString();
            setConnected(true);
            setAddress(addr);
            await AsyncStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, addr);
            return;
          } catch {
            // Silent reconnect failed
          }
        }
      }

      // Mobile or web without extension: restore from storage
      setConnected(true);
      setAddress(storedAddress);
    } catch (err) {
      console.error('restoreSession error:', err);
    }
  };

  // ─── Connect ──────────────────────────────────────────────
  const connectWallet = async () => {
    if (connecting) return;
    setConnecting(true);
    setError(null);

    try {
      // ── WEB: try extension first ──
      if (Platform.OS === 'web') {
        const provider = getSolanaProvider();

        if (provider) {
          try {
            const resp = await provider.connect();
            const addr = resp.publicKey.toString();
            setConnected(true);
            setAddress(addr);
            setError(null);
            await AsyncStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, addr);
            console.log('Wallet connected via extension:', addr);
          } catch (err: any) {
            setError(err?.code === 4001 ? 'Connection rejected.' : (err?.message || 'Connection failed.'));
          }
          setConnecting(false);
          return;
        }
      }

      // ── No extension OR mobile: use Phantom universal link ──

      // IMPORTANT: Save the keypair BEFORE redirecting!
      await saveKeypair(dappKeyPair.current);

      const dappPubKeyB58 = bs58.encode(Buffer.from(dappKeyPair.current.publicKey));

      // Build redirect URI
      let redirectUri: string;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        redirectUri = window.location.origin + window.location.pathname;
      } else {
        redirectUri = Linking.createURL('onConnect');
      }

      const connectParams = new URLSearchParams({
        dapp_encryption_public_key: dappPubKeyB58,
        cluster: 'mainnet-beta',
        app_url: 'https://quantum-ia.com',
        redirect_link: redirectUri,
      });

      const connectUrl = `https://phantom.app/ul/v1/connect?${connectParams.toString()}`;
      console.log('Opening Phantom connect URL');

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Web: try to break out of iframe, or open new tab
        try {
          if (window.top && window.top !== window) {
            window.open(connectUrl, '_blank');
          } else {
            window.location.href = connectUrl;
            return;
          }
        } catch {
          window.open(connectUrl, '_blank');
        }
        setError('PHANTOM_OPENED');
        setConnecting(false);
      } else {
        // Mobile: open Phantom via universal link
        await Linking.openURL(connectUrl);
        // Keep connecting=true until callback
      }
    } catch (err: any) {
      console.error('connectWallet error:', err);
      setError(err?.message || 'Failed to connect wallet.');
      setConnecting(false);
    }
  };

  // ─── Disconnect ───────────────────────────────────────────
  const disconnectWallet = async () => {
    try {
      if (Platform.OS === 'web') {
        const provider = getSolanaProvider();
        if (provider) try { await provider.disconnect(); } catch {}
      }
      await clearSession();
    } catch {
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
    setError(null);
    sessionRef.current = null;
    sharedSecretRef.current = null;
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.WALLET_ADDRESS,
      STORAGE_KEYS.SESSION,
      STORAGE_KEYS.SECRET_KEY,
      STORAGE_KEYS.PUBLIC_KEY,
    ]);
  };

  // Compute voting power from real balance
  const votingPower = quantumBalance ? Math.floor(quantumBalance.amount) : 0;

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
        votingPower,
        error,
        clearError,
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
