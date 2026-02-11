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
const IDB_NAME = 'QuantumWalletDB';
const IDB_STORE = 'keypairs';

// ═══════════════════════════════════════════════════════════════
// ROBUST STORAGE: IndexedDB + localStorage + sessionStorage + cookie
// IndexedDB survives app restarts on mobile better than localStorage
// ═══════════════════════════════════════════════════════════════

function openIndexedDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
    } catch {
      resolve(null);
    }
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openIndexedDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbRemove(key: string): Promise<void> {
  const db = await openIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// Store in ALL available storage mechanisms
async function persistData(key: string, value: string): Promise<void> {
  console.log(`[Storage] Persisting ${key}...`);
  
  // IndexedDB (most reliable on mobile)
  await idbSet(key, value);
  
  // AsyncStorage (React Native)
  try {
    await AsyncStorage.setItem(key, value);
  } catch {}
  
  // Web storage
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { window.localStorage.setItem(key, value); } catch {}
    try { window.sessionStorage.setItem(key, value); } catch {}
    try {
      document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=3600; SameSite=Lax`;
    } catch {}
  }
  
  console.log(`[Storage] ${key} persisted to all storage`);
}

// Retrieve from ANY available storage (with retries)
async function retrieveData(key: string, retries = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`[Storage] Retrieving ${key} (attempt ${attempt}/${retries})...`);
    
    // Try IndexedDB first (most reliable)
    let data = await idbGet(key);
    if (data) {
      console.log(`[Storage] Found in IndexedDB`);
      return data;
    }
    
    // Try AsyncStorage
    try {
      data = await AsyncStorage.getItem(key);
      if (data) {
        console.log(`[Storage] Found in AsyncStorage`);
        return data;
      }
    } catch {}
    
    // Try web storage
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        data = window.localStorage.getItem(key);
        if (data) {
          console.log(`[Storage] Found in localStorage`);
          return data;
        }
      } catch {}
      
      try {
        data = window.sessionStorage.getItem(key);
        if (data) {
          console.log(`[Storage] Found in sessionStorage`);
          return data;
        }
      } catch {}
      
      try {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, ...valueParts] = cookie.trim().split('=');
          if (name === key) {
            data = decodeURIComponent(valueParts.join('='));
            console.log(`[Storage] Found in cookie`);
            return data;
          }
        }
      } catch {}
    }
    
    // Wait before retry (storage might not be ready yet after app restart)
    if (attempt < retries) {
      console.log(`[Storage] Not found, waiting 500ms before retry...`);
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  console.log(`[Storage] ${key} not found in any storage after ${retries} attempts`);
  return null;
}

// Remove from all storage
async function removeData(key: string): Promise<void> {
  await idbRemove(key);
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

  // ─── Handle Phantom callback ───────────────────────────────
  const handlePhantomCallback = useCallback(async (url: string) => {
    console.log('[Wallet] Processing Phantom callback...');
    
    try {
      await ensureCrypto();
      
      const parsedUrl = new URL(url);
      const params = parsedUrl.searchParams;
      
      // Check for error
      const errorCode = params.get('errorCode');
      if (errorCode) {
        const errorMsg = params.get('errorMessage') || 'Connection cancelled';
        console.log('[Wallet] User cancelled:', errorMsg);
        setError(errorMsg);
        setConnecting(false);
        return;
      }
      
      // Get encrypted response params
      const phantomPubKey = params.get('phantom_encryption_public_key');
      const nonce = params.get('nonce');
      const data = params.get('data');
      
      if (!phantomPubKey || !nonce || !data) {
        console.log('[Wallet] Invalid callback - missing parameters');
        setError('Connection failed. Please try again.');
        setConnecting(false);
        return;
      }
      
      // Restore keypair from storage (with retries for mobile cold start)
      const keypairData = await retrieveData(KEYPAIR_KEY, 5);
      
      if (!keypairData) {
        console.error('[Wallet] Keypair not found - connection lost');
        setError('Connection failed. Please try again.');
        setConnecting(false);
        return;
      }
      
      const keypair = JSON.parse(keypairData);
      const secretKey = new Uint8Array(keypair.sec);
      
      console.log('[Wallet] Keypair restored, decrypting...');
      
      // Decrypt the response
      const phantomPubKeyBytes = bs58.decode(phantomPubKey);
      const nonceBytes = bs58.decode(nonce);
      const dataBytes = bs58.decode(data);
      
      const sharedSecret = nacl.box.before(phantomPubKeyBytes, secretKey);
      const decrypted = nacl.box.open.after(dataBytes, nonceBytes, sharedSecret);
      
      if (!decrypted) {
        console.error('[Wallet] Decryption failed');
        setError('Connection failed. Please try again.');
        setConnecting(false);
        return;
      }
      
      const payload = JSON.parse(Buffer.from(decrypted).toString('utf8'));
      const walletAddress = payload.public_key;
      
      console.log('[Wallet] ✅ WALLET CONNECTED:', walletAddress);
      
      // ═══════════════════════════════════════════════════════
      // GOLDEN RULE: Persist publicKey immediately
      // This is the ONLY source of truth
      // ═══════════════════════════════════════════════════════
      await persistData(WALLET_KEY, walletAddress);
      
      setConnected(true);
      setAddress(walletAddress);
      
      // Clean up keypair (no longer needed)
      await removeData(KEYPAIR_KEY);
      
    } catch (err: any) {
      console.error('[Wallet] Callback error:', err);
      setError('Connection failed. Please try again.');
    } finally {
      setConnecting(false);
    }
  }, []);

  // ─── Check for callback on mount ───────────────────────────
  useEffect(() => {
    const init = async () => {
      // FIRST: Check if we have a persisted wallet address (GOLDEN RULE)
      // publicKey persisted = wallet connected
      const savedAddress = await retrieveData(WALLET_KEY, 3);
      
      if (savedAddress) {
        console.log('[Wallet] ✅ Restored wallet from storage:', savedAddress);
        setConnected(true);
        setAddress(savedAddress);
        return; // Already connected, no need to process callback
      }
      
      // SECOND: Check for Phantom callback in URL
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const url = window.location.href;
        if (url.includes('phantom_encryption_public_key') || url.includes('errorCode')) {
          console.log('[Wallet] Detected Phantom callback in URL');
          setConnecting(true);
          
          // Small delay to ensure storage is ready after app restart
          await new Promise(r => setTimeout(r, 300));
          
          await handlePhantomCallback(url);
          
          // Clean URL
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
      
      // THIRD: Try browser extension silent reconnect (desktop)
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
  }, [handlePhantomCallback]);

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
      // DESKTOP: Try browser extension first
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const solana = (window as any).solana;
        
        if (solana?.isPhantom) {
          console.log('[Wallet] Using browser extension...');
          try {
            const response = await solana.connect();
            const publicKey = response.publicKey.toString();
            
            console.log('[Wallet] ✅ WALLET CONNECTED:', publicKey);
            
            await persistData(WALLET_KEY, publicKey);
            setConnected(true);
            setAddress(publicKey);
            setConnecting(false);
            return;
          } catch (err: any) {
            if (err?.code === 4001) {
              setError('Connection rejected by user.');
              setConnecting(false);
              return;
            }
          }
        }
      }

      // MOBILE: Use Phantom deep link
      console.log('[Wallet] Using deep link for mobile...');
      
      await ensureCrypto();
      
      // Generate keypair and persist it BEFORE redirect
      const keypair = nacl.box.keyPair();
      const keypairData = JSON.stringify({
        pub: Array.from(keypair.publicKey),
        sec: Array.from(keypair.secretKey),
      });
      
      // Store in ALL storage mechanisms
      await persistData(KEYPAIR_KEY, keypairData);
      
      // Verify storage
      const verify = await retrieveData(KEYPAIR_KEY, 1);
      if (!verify) {
        console.error('[Wallet] Failed to persist keypair');
        setError('Storage error. Please try again.');
        setConnecting(false);
        return;
      }
      console.log('[Wallet] ✅ Keypair verified in storage');
      
      const dappPubKey = bs58.encode(keypair.publicKey);
      
      // Build redirect URL
      let redirectUrl: string;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        redirectUrl = window.location.origin + window.location.pathname;
      } else {
        redirectUrl = Linking.createURL('phantom-callback');
      }
      
      console.log('[Wallet] Redirect URL:', redirectUrl);
      
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
        window.location.href = phantomUrl;
      } else {
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
      setError('Connection failed. Please try again.');
      setConnecting(false);
    }
  };

  // ─── Disconnect ───────────────────────────────────────────
  const disconnectWallet = async () => {
    console.log('[Wallet] Disconnecting...');
    
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const solana = (window as any).solana;
        if (solana?.isPhantom) {
          await solana.disconnect();
        }
      }
    } catch {}
    
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
