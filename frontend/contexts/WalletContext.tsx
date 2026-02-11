import 'react-native-get-random-values';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { Buffer } from 'buffer';
import {
  getQuantumBalance,
  getSolBalance,
  getUsdToEurRate,
  QUANTUM_PRICE_USD,
  TokenBalance,
} from '../utils/solanaRpc';

// ─── Lazy load crypto libs ──────────────────────────────────
let nacl: any = null;
let bs58: any = null;

async function ensureCrypto() {
  if (!nacl) {
    const mod = await import('tweetnacl');
    nacl = mod.default || mod;
  }
  if (!bs58) {
    const mod = await import('bs58');
    bs58 = mod.default || mod;
  }
}

// ─── Storage Keys ───────────────────────────────────────────
const WALLET_KEY = 'quantum_wallet_address';
const KEYPAIR_KEY = 'quantum_dapp_keypair';

// ─── Robust storage (multiple fallbacks for mobile) ─────────
function storeData(key: string, value: string): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  
  try {
    // localStorage
    window.localStorage.setItem(key, value);
    // sessionStorage (survives better on some browsers)
    window.sessionStorage.setItem(key, value);
    // Cookie (most reliable for redirects)
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=3600; SameSite=Lax`;
    console.log('[Storage] Data stored in localStorage, sessionStorage, and cookie');
  } catch (e) {
    console.error('[Storage] Store error:', e);
  }
}

function getData(key: string): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  
  let data: string | null = null;
  
  // Try localStorage first
  try {
    data = window.localStorage.getItem(key);
    if (data) {
      console.log('[Storage] Found in localStorage');
      return data;
    }
  } catch (e) {}
  
  // Try sessionStorage
  try {
    data = window.sessionStorage.getItem(key);
    if (data) {
      console.log('[Storage] Found in sessionStorage');
      return data;
    }
  } catch (e) {}
  
  // Try cookie
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (name === key) {
        data = decodeURIComponent(valueParts.join('='));
        console.log('[Storage] Found in cookie');
        return data;
      }
    }
  } catch (e) {}
  
  console.log('[Storage] Data not found in any storage');
  return null;
}

function removeData(key: string): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  
  try {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
    document.cookie = `${key}=; path=/; max-age=0`;
  } catch (e) {}
}

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

// ─── Check for browser extension ────────────────────────────
const getPhantomProvider = (): any | null => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const solana = (window as any).solana;
    if (solana?.isPhantom) return solana;
  }
  return null;
};

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

  const clearError = useCallback(() => setError(null), []);

  // ─── Store keypair persistently ────────────────────────────
  const storeKeypair = async (publicKey: Uint8Array, secretKey: Uint8Array) => {
    const data = JSON.stringify({
      pub: Array.from(publicKey),
      sec: Array.from(secretKey),
    });
    
    // Store in multiple places for reliability
    storeData(KEYPAIR_KEY, data);
    await AsyncStorage.setItem(KEYPAIR_KEY, data);
    
    console.log('[Wallet] Keypair stored in multiple locations');
  };

  // ─── Restore keypair ───────────────────────────────────────
  const restoreKeypair = async (): Promise<{ publicKey: Uint8Array; secretKey: Uint8Array } | null> => {
    try {
      // Try web storage first (localStorage, sessionStorage, cookie)
      let data = getData(KEYPAIR_KEY);
      
      // Fallback to AsyncStorage
      if (!data) {
        data = await AsyncStorage.getItem(KEYPAIR_KEY);
        if (data) console.log('[Storage] Found in AsyncStorage');
      }
      
      if (data) {
        const parsed = JSON.parse(data);
        console.log('[Wallet] Keypair restored successfully');
        return {
          publicKey: new Uint8Array(parsed.pub),
          secretKey: new Uint8Array(parsed.sec),
        };
      }
      
      console.log('[Wallet] No keypair found in any storage');
    } catch (e) {
      console.error('[Wallet] Failed to restore keypair:', e);
    }
    return null;
  };

  // ─── Handle Phantom callback ───────────────────────────────
  const handlePhantomCallback = useCallback(async (url: string) => {
    console.log('[Wallet] Processing callback URL...');
    
    try {
      await ensureCrypto();
      
      const parsedUrl = new URL(url);
      const params = parsedUrl.searchParams;
      
      // Check for error
      const errorCode = params.get('errorCode');
      if (errorCode) {
        const errorMsg = params.get('errorMessage') || 'Connection rejected';
        console.log('[Wallet] Phantom returned error:', errorMsg);
        setError(errorMsg);
        setConnecting(false);
        return;
      }
      
      // Get encrypted response params
      const phantomPubKey = params.get('phantom_encryption_public_key');
      const nonce = params.get('nonce');
      const data = params.get('data');
      
      if (!phantomPubKey || !nonce || !data) {
        console.log('[Wallet] Missing callback params');
        setError('Invalid callback - missing parameters');
        setConnecting(false);
        return;
      }
      
      // Restore our keypair
      const keypair = await restoreKeypair();
      if (!keypair) {
        console.error('[Wallet] No keypair found for decryption');
        setError('Session expired. Please try again.');
        setConnecting(false);
        return;
      }
      
      // Decrypt the response
      const phantomPubKeyBytes = bs58.decode(phantomPubKey);
      const nonceBytes = bs58.decode(nonce);
      const dataBytes = bs58.decode(data);
      
      const sharedSecret = nacl.box.before(phantomPubKeyBytes, keypair.secretKey);
      const decrypted = nacl.box.open.after(dataBytes, nonceBytes, sharedSecret);
      
      if (!decrypted) {
        console.error('[Wallet] Decryption failed');
        setError('Connection failed. Please try again.');
        setConnecting(false);
        return;
      }
      
      const payload = JSON.parse(Buffer.from(decrypted).toString('utf8'));
      const walletAddress = payload.public_key;
      
      console.log('[Wallet] Wallet connected:', walletAddress);
      
      // Store wallet address
      setConnected(true);
      setAddress(walletAddress);
      await AsyncStorage.setItem(WALLET_KEY, walletAddress);
      
      // Clean up keypair after successful connection
      await AsyncStorage.removeItem(KEYPAIR_KEY);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.removeItem(KEYPAIR_KEY);
      }
      
    } catch (err: any) {
      console.error('[Wallet] Callback processing error:', err);
      setError(err?.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  }, []);

  // ─── Check URL on mount (for redirect callback) ────────────
  useEffect(() => {
    const checkForCallback = async () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const url = window.location.href;
        if (url.includes('phantom_encryption_public_key') || url.includes('errorCode')) {
          console.log('[Wallet] Detected Phantom callback in URL');
          setConnecting(true);
          await handlePhantomCallback(url);
          
          // Clean URL
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
    };
    
    checkForCallback();
  }, [handlePhantomCallback]);

  // ─── Restore session on mount ──────────────────────────────
  useEffect(() => {
    const restore = async () => {
      // Check for stored wallet address
      const storedAddress = await AsyncStorage.getItem(WALLET_KEY);
      if (storedAddress) {
        console.log('[Wallet] Session restored:', storedAddress);
        setConnected(true);
        setAddress(storedAddress);
      }
      
      // Try silent reconnect via extension (desktop)
      const provider = getPhantomProvider();
      if (provider) {
        try {
          const resp = await provider.connect({ onlyIfTrusted: true });
          const addr = resp.publicKey.toString();
          setConnected(true);
          setAddress(addr);
          await AsyncStorage.setItem(WALLET_KEY, addr);
        } catch {
          // Not auto-approved
        }
      }
    };
    
    restore();
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

      console.log('[Wallet] Token balance:', qtmBal.amount, 'SOL:', sol);
      
      setQuantumBalance(qtmBal);
      setSolBalance(sol);
      setEurRate(rate);
      
      const usd = qtmBal.amount * QUANTUM_PRICE_USD;
      setUsdValue(usd);
      setEurValue(usd * rate);
    } catch (err: any) {
      console.error('[Wallet] Balance fetch error:', err);
    } finally {
      setLoadingBalances(false);
    }
  }, [address]);

  // ─── Connect Wallet ────────────────────────────────────────
  const connectWallet = async () => {
    console.log('[Wallet] Connect button clicked');
    
    if (connecting) return;
    setConnecting(true);
    setError(null);

    try {
      // ═══════════════════════════════════════════════════════
      // DESKTOP: Try browser extension first
      // ═══════════════════════════════════════════════════════
      const provider = getPhantomProvider();
      
      if (provider) {
        console.log('[Wallet] Using browser extension...');
        try {
          const response = await provider.connect();
          const publicKey = response.publicKey.toString();
          
          console.log('[Wallet] Wallet connected:', publicKey);
          
          setConnected(true);
          setAddress(publicKey);
          await AsyncStorage.setItem(WALLET_KEY, publicKey);
          setConnecting(false);
          return;
        } catch (err: any) {
          if (err?.code === 4001) {
            setError('Connection rejected by user.');
            setConnecting(false);
            return;
          }
          // Fall through to deep link
        }
      }

      // ═══════════════════════════════════════════════════════
      // MOBILE: Use Phantom deep link
      // ═══════════════════════════════════════════════════════
      console.log('[Wallet] Using deep link for mobile...');
      
      await ensureCrypto();
      
      // Generate fresh keypair for this connection
      const keypair = nacl.box.keyPair();
      await storeKeypair(keypair.publicKey, keypair.secretKey);
      
      const dappPubKey = bs58.encode(keypair.publicKey);
      
      // Build redirect URL
      let redirectUrl: string;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        redirectUrl = window.location.origin + window.location.pathname;
      } else {
        redirectUrl = Linking.createURL('phantom-callback');
      }
      
      console.log('[Wallet] Redirect URL:', redirectUrl);
      console.log('[Wallet] DApp public key:', dappPubKey.substring(0, 8) + '...');
      
      // Build Phantom connect URL
      const connectParams = new URLSearchParams({
        dapp_encryption_public_key: dappPubKey,
        cluster: 'mainnet-beta',
        app_url: redirectUrl,
        redirect_link: redirectUrl,
      });
      
      const phantomUrl = `https://phantom.app/ul/v1/connect?${connectParams.toString()}`;
      
      console.log('[Wallet] Opening Phantom...');
      
      // Open Phantom
      if (Platform.OS === 'web') {
        // On mobile web, redirect to Phantom
        window.location.href = phantomUrl;
      } else {
        // On native, use WebBrowser
        const result = await WebBrowser.openAuthSessionAsync(phantomUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          await handlePhantomCallback(result.url);
        } else if (result.type === 'cancel') {
          setError('Connection cancelled');
          setConnecting(false);
        }
      }
      
    } catch (err: any) {
      console.error('[Wallet] Connect error:', err);
      setError(err?.message || 'Connection failed');
      setConnecting(false);
    }
  };

  // ─── Disconnect ───────────────────────────────────────────
  const disconnectWallet = async () => {
    try {
      const provider = getPhantomProvider();
      if (provider) {
        await provider.disconnect();
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
    await AsyncStorage.removeItem(KEYPAIR_KEY);
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.removeItem(WALLET_KEY);
      window.localStorage.removeItem(KEYPAIR_KEY);
    }
    
    console.log('[Wallet] Disconnected');
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
