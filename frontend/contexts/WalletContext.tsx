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
import * as WebBrowser from 'expo-web-browser';
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

// Ensure auth session completes properly
WebBrowser.maybeCompleteAuthSession();

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

// ─── Browser extension (web only) ───────────────────────────
const getSolanaProvider = (): any | null => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const w = window as any;
    if (w.phantom?.solana?.isPhantom) return w.phantom.solana;
    if (w.solana?.isPhantom) return w.solana;
    if (w.solana) return w.solana;
  }
  return null;
};

const WALLET_KEY = 'walletAddress';

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

  // Keypair generated lazily to avoid "no PRNG" error
  const dappKeyPair = useRef<{ publicKey: Uint8Array; secretKey: Uint8Array } | null>(null);

  const getOrCreateKeyPair = useCallback(() => {
    if (!dappKeyPair.current) {
      dappKeyPair.current = nacl.box.keyPair();
    }
    return dappKeyPair.current;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // ─── Restore session on mount ──────────────────────────────
  useEffect(() => {
    restoreSession();
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

    try {
      console.log('[Wallet] Fetching on-chain data for:', address);
      const [qtmBal, sol, rate] = await Promise.all([
        getQuantumBalance(address),
        getSolBalance(address),
        getUsdToEurRate(),
      ]);

      console.log('[Wallet] QTM:', qtmBal.amount, 'SOL:', sol, 'EUR rate:', rate);
      setQuantumBalance(qtmBal);
      setSolBalance(sol);
      setEurRate(rate);
      const usd = qtmBal.amount * QUANTUM_PRICE_USD;
      setUsdValue(usd);
      setEurValue(usd * rate);
    } catch (err: any) {
      console.error('[Wallet] Balance fetch error:', err);
      // Don't set error — wallet IS connected, RPC is just slow
    } finally {
      setLoadingBalances(false);
    }
  }, [address]);

  // ─── Restore previous session ──────────────────────────────
  const restoreSession = async () => {
    try {
      const storedAddress = await AsyncStorage.getItem(WALLET_KEY);
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
            await AsyncStorage.setItem(WALLET_KEY, addr);
            return;
          } catch {
            // Extension not auto-approved — still restore from storage
          }
        }
      }

      // Restore from stored address (balances will be fetched via useEffect)
      setConnected(true);
      setAddress(storedAddress);
    } catch (err) {
      console.error('[Wallet] Restore error:', err);
    }
  };

  // ─── Decrypt Phantom response ──────────────────────────────
  const decryptPhantomResponse = (url: string): string | null => {
    try {
      const parsedUrl = new URL(url);
      const params = parsedUrl.searchParams;

      // Check for Phantom error
      const errorCode = params.get('errorCode');
      if (errorCode) {
        const msg = params.get('errorMessage') || 'Connection rejected.';
        throw new Error(msg);
      }

      const phantomPubKeyStr = params.get('phantom_encryption_public_key');
      const nonceStr = params.get('nonce');
      const dataStr = params.get('data');

      if (!phantomPubKeyStr || !nonceStr || !dataStr) {
        throw new Error('Missing Phantom response parameters.');
      }

      // Decode bs58 values
      const phantomPubKey = new Uint8Array(bs58.decode(phantomPubKeyStr));
      const nonce = new Uint8Array(bs58.decode(nonceStr));
      const encryptedData = new Uint8Array(bs58.decode(dataStr));

      // Get our secret key (still in memory — openAuthSessionAsync keeps the app alive)
      const kp = getOrCreateKeyPair();
      const secretKey = kp.secretKey;

      console.log('[Wallet] Decrypting with keypair publicKey:', 
        bs58.encode(Buffer.from(kp.publicKey)).substring(0, 8) + '...');

      // Derive shared secret using X25519
      const sharedSecret = nacl.box.before(phantomPubKey, secretKey);

      // Decrypt the response
      const decrypted = nacl.box.open.after(encryptedData, nonce, sharedSecret);

      if (!decrypted) {
        throw new Error('Decryption returned null — keypair mismatch.');
      }

      const payload = JSON.parse(Buffer.from(decrypted).toString('utf8'));
      console.log('[Wallet] Decrypted payload:', JSON.stringify(payload).substring(0, 100));

      return payload.public_key;
    } catch (err: any) {
      console.error('[Wallet] Decrypt error:', err?.message);
      throw err;
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
            await AsyncStorage.setItem(WALLET_KEY, addr);
            console.log('[Wallet] Connected via extension:', addr);
            setConnecting(false);
            return;
          } catch (err: any) {
            setError(err?.code === 4001 ? 'Connection rejected.' : (err?.message || 'Failed.'));
            setConnecting(false);
            return;
          }
        }

        // Web without extension: redirect to Phantom
        const currentUrl = window.location.origin + window.location.pathname;
        const dappPubKeyB58 = bs58.encode(Buffer.from(getOrCreateKeyPair().publicKey));

        const connectParams = new URLSearchParams({
          dapp_encryption_public_key: dappPubKeyB58,
          cluster: 'mainnet-beta',
          app_url: currentUrl,
          redirect_link: currentUrl,
        });

        const connectUrl = `https://phantom.app/ul/v1/connect?${connectParams.toString()}`;

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
        return;
      }

      // ── MOBILE: use expo-web-browser (keeps app alive!) ──
      const dappPubKeyB58 = bs58.encode(Buffer.from(dappKeyPair.current.publicKey));
      const redirectUri = Linking.createURL('onConnect');

      console.log('[Wallet] Redirect URI:', redirectUri);
      console.log('[Wallet] Dapp public key:', dappPubKeyB58.substring(0, 8) + '...');

      const connectParams = new URLSearchParams({
        dapp_encryption_public_key: dappPubKeyB58,
        cluster: 'mainnet-beta',
        app_url: 'https://quantum-ia.com',
        redirect_link: redirectUri,
      });

      const connectUrl = `https://phantom.app/ul/v1/connect?${connectParams.toString()}`;

      console.log('[Wallet] Opening Phantom auth session...');

      // openAuthSessionAsync opens a browser, waits for redirect back to our scheme,
      // and returns the result — the app stays alive, keypair stays in memory!
      const result = await WebBrowser.openAuthSessionAsync(connectUrl, redirectUri);

      console.log('[Wallet] Auth session result type:', result.type);

      if (result.type === 'success' && result.url) {
        console.log('[Wallet] Got redirect URL:', result.url.substring(0, 80) + '...');

        const walletAddress = decryptPhantomResponse(result.url);

        if (walletAddress) {
          setConnected(true);
          setAddress(walletAddress);
          await AsyncStorage.setItem(WALLET_KEY, walletAddress);
          console.log('[Wallet] Connected:', walletAddress);
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        setError('Connection cancelled.');
      }
    } catch (err: any) {
      console.error('[Wallet] Connect error:', err?.message || err);
      setError(err?.message || 'Connection failed.');
    } finally {
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
    } catch {}
    setConnected(false);
    setAddress(null);
    setQuantumBalance(null);
    setSolBalance(0);
    setUsdValue(0);
    setEurValue(0);
    setError(null);
    await AsyncStorage.removeItem(WALLET_KEY);
  };

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
