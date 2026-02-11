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

// ─── Constants ──────────────────────────────────────────────
const WALLET_KEY = 'quantum_wallet_address';
const KEYPAIR_KEY = 'quantum_dapp_keypair';

// ─── Robust persistent storage ──────────────────────────────
async function persistData(key: string, value: string): Promise<void> {
  // Store in multiple places
  try { await AsyncStorage.setItem(key, value); } catch {}
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { window.localStorage.setItem(key, value); } catch {}
    try { window.sessionStorage.setItem(key, value); } catch {}
    try { 
      document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=86400; SameSite=Lax`; 
    } catch {}
  }
  console.log(`[Storage] ${key} persisted`);
}

async function retrieveData(key: string): Promise<string | null> {
  // Try all storage mechanisms
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const ls = window.localStorage.getItem(key);
      if (ls) { console.log(`[Storage] ${key} found in localStorage`); return ls; }
    } catch {}
    try {
      const ss = window.sessionStorage.getItem(key);
      if (ss) { console.log(`[Storage] ${key} found in sessionStorage`); return ss; }
    } catch {}
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, ...parts] = cookie.trim().split('=');
        if (name === key) {
          const val = decodeURIComponent(parts.join('='));
          console.log(`[Storage] ${key} found in cookie`);
          return val;
        }
      }
    } catch {}
  }
  try {
    const as = await AsyncStorage.getItem(key);
    if (as) { console.log(`[Storage] ${key} found in AsyncStorage`); return as; }
  } catch {}
  
  console.log(`[Storage] ${key} not found`);
  return null;
}

async function removeData(key: string): Promise<void> {
  try { await AsyncStorage.removeItem(key); } catch {}
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { window.localStorage.removeItem(key); } catch {}
    try { window.sessionStorage.removeItem(key); } catch {}
    try { document.cookie = `${key}=; path=/; max-age=0`; } catch {}
  }
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

  // ─── Process Phantom deep link callback ────────────────────
  const processPhantomCallback = useCallback(async (url: string): Promise<boolean> => {
    console.log('[Wallet] Processing callback...');
    
    try {
      await ensureCrypto();
      
      const parsedUrl = new URL(url);
      const params = parsedUrl.searchParams;
      
      // Check for error
      if (params.get('errorCode')) {
        const msg = params.get('errorMessage') || 'Connection cancelled';
        console.log('[Wallet] User cancelled:', msg);
        setError(msg);
        return false;
      }
      
      // Get params
      const phantomPubKey = params.get('phantom_encryption_public_key');
      const nonce = params.get('nonce');
      const data = params.get('data');
      
      if (!phantomPubKey || !nonce || !data) {
        console.log('[Wallet] Missing callback params');
        return false;
      }
      
      // Get stored keypair
      const keypairJson = await retrieveData(KEYPAIR_KEY);
      if (!keypairJson) {
        console.log('[Wallet] No keypair found');
        setError('Connection failed. Please try again.');
        return false;
      }
      
      const keypair = JSON.parse(keypairJson);
      const secretKey = new Uint8Array(keypair.sec);
      
      // Decrypt
      const phantomBytes = bs58.decode(phantomPubKey);
      const nonceBytes = bs58.decode(nonce);
      const dataBytes = bs58.decode(data);
      
      const sharedSecret = nacl.box.before(phantomBytes, secretKey);
      const decrypted = nacl.box.open.after(dataBytes, nonceBytes, sharedSecret);
      
      if (!decrypted) {
        console.log('[Wallet] Decryption failed');
        setError('Connection failed. Please try again.');
        return false;
      }
      
      const payload = JSON.parse(Buffer.from(decrypted).toString('utf8'));
      const walletAddress = payload.public_key;
      
      // SUCCESS! Persist the publicKey
      console.log('[Wallet] ✅ CONNECTED:', walletAddress);
      await persistData(WALLET_KEY, walletAddress);
      await removeData(KEYPAIR_KEY);
      
      setConnected(true);
      setAddress(walletAddress);
      return true;
      
    } catch (err: any) {
      console.error('[Wallet] Callback error:', err);
      setError('Connection failed. Please try again.');
      return false;
    }
  }, []);

  // ─── Initialize on mount ───────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // FIRST: Check for persisted wallet (GOLDEN RULE)
      const savedAddr = await retrieveData(WALLET_KEY);
      if (savedAddr) {
        console.log('[Wallet] ✅ Restored from storage:', savedAddr);
        setConnected(true);
        setAddress(savedAddr);
        return;
      }
      
      // SECOND: Check for Phantom callback in URL
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const url = window.location.href;
        if (url.includes('phantom_encryption_public_key') || url.includes('errorCode')) {
          console.log('[Wallet] Detected callback in URL');
          setConnecting(true);
          
          // Wait for storage to be ready
          await new Promise(r => setTimeout(r, 200));
          
          const success = await processPhantomCallback(url);
          setConnecting(false);
          
          // Clean URL
          const clean = window.location.origin + window.location.pathname;
          window.history.replaceState({}, '', clean);
          
          if (success) return;
        }
      }
      
      // THIRD: Try silent reconnect via extension
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const solana = (window as any).solana;
        if (solana?.isPhantom) {
          try {
            const resp = await solana.connect({ onlyIfTrusted: true });
            const addr = resp.publicKey.toString();
            console.log('[Wallet] ✅ Auto-connected via extension:', addr);
            await persistData(WALLET_KEY, addr);
            setConnected(true);
            setAddress(addr);
          } catch {}
        }
      }
    };
    
    init();
  }, [processPhantomCallback]);

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

  // ─── Fetch on-chain data ───────────────────────────────────
  const refreshBalances = useCallback(async () => {
    if (!address) return;
    setLoadingBalances(true);

    try {
      console.log('[Wallet] Fetching balances for:', address);
      
      const [qtm, sol, rate] = await Promise.all([
        getQuantumBalance(address),
        getSolBalance(address),
        getUsdToEurRate(),
      ]);

      console.log('[Wallet] Balance:', qtm.amount, 'QTM,', sol, 'SOL');
      
      setQuantumBalance(qtm);
      setSolBalance(sol);
      setEurRate(rate);
      setUsdValue(qtm.amount * QUANTUM_PRICE_USD);
      setEurValue(qtm.amount * QUANTUM_PRICE_USD * rate);
    } catch (err) {
      console.error('[Wallet] Balance error:', err);
    } finally {
      setLoadingBalances(false);
    }
  }, [address]);

  // ─── Connect Wallet ────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    console.log('[Wallet] Connect clicked');
    
    if (connecting) return;
    
    // Already connected? Just refresh
    if (connected && address) {
      await refreshBalances();
      return;
    }
    
    setConnecting(true);
    setError(null);

    try {
      // TRY EXTENSION FIRST (desktop)
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const solana = (window as any).solana;
        
        if (solana?.isPhantom) {
          console.log('[Wallet] Using extension...');
          try {
            const resp = await solana.connect();
            const addr = resp.publicKey.toString();
            
            console.log('[Wallet] ✅ CONNECTED:', addr);
            await persistData(WALLET_KEY, addr);
            setConnected(true);
            setAddress(addr);
            setConnecting(false);
            return;
          } catch (err: any) {
            if (err?.code === 4001) {
              setError('Connection rejected');
              setConnecting(false);
              return;
            }
            // Fall through to deep link
          }
        }
      }

      // MOBILE: Use deep link
      console.log('[Wallet] Using deep link...');
      await ensureCrypto();
      
      // Generate keypair
      const kp = nacl.box.keyPair();
      const keypairJson = JSON.stringify({
        pub: Array.from(kp.publicKey),
        sec: Array.from(kp.secretKey),
      });
      
      await persistData(KEYPAIR_KEY, keypairJson);
      
      const dappPubKey = bs58.encode(kp.publicKey);
      const redirectUrl = Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin + window.location.pathname
        : Linking.createURL('phantom-callback');
      
      console.log('[Wallet] Redirect:', redirectUrl);
      
      const params = new URLSearchParams({
        dapp_encryption_public_key: dappPubKey,
        cluster: 'mainnet-beta',
        app_url: redirectUrl,
        redirect_link: redirectUrl,
      });
      
      const phantomUrl = `https://phantom.app/ul/v1/connect?${params}`;
      
      console.log('[Wallet] Opening Phantom...');
      
      if (Platform.OS === 'web') {
        window.location.href = phantomUrl;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(phantomUrl, redirectUrl);
        if (result.type === 'success' && result.url) {
          await processPhantomCallback(result.url);
        }
        setConnecting(false);
      }
      
    } catch (err: any) {
      console.error('[Wallet] Error:', err);
      setError('Connection failed');
      setConnecting(false);
    }
  }, [connected, address, connecting, refreshBalances, processPhantomCallback]);

  // ─── Disconnect ────────────────────────────────────────────
  const disconnectWallet = useCallback(async () => {
    console.log('[Wallet] Disconnecting...');
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const solana = (window as any).solana;
      if (solana?.isPhantom) {
        try { await solana.disconnect(); } catch {}
      }
    }
    
    setConnected(false);
    setAddress(null);
    setQuantumBalance(null);
    setSolBalance(0);
    setUsdValue(0);
    setEurValue(0);
    setError(null);
    
    await removeData(WALLET_KEY);
    await removeData(KEYPAIR_KEY);
    
    console.log('[Wallet] ✅ Disconnected');
  }, []);

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
