import 'react-native-get-random-values';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
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

// ─── Lazy load crypto ───────────────────────────────────────
let nacl: any = null;
let bs58: any = null;

async function ensureCrypto() {
  if (!nacl) {
    const m = await import('tweetnacl');
    nacl = m.default || m;
  }
  if (!bs58) {
    const m = await import('bs58');
    bs58 = m.default || m;
  }
}

// ─── Storage ────────────────────────────────────────────────
const WALLET_KEY = 'quantum_wallet';
const KEYPAIR_KEY = 'quantum_keypair';

async function saveToStorage(key: string, value: string): Promise<void> {
  console.log(`[Storage] Saving ${key}...`);
  
  // Save to ALL storage mechanisms
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // localStorage
    try { 
      localStorage.setItem(key, value); 
      console.log(`[Storage] ✓ Saved to localStorage`); 
    } catch (e) { 
      console.log('[Storage] localStorage failed:', e); 
    }
    
    // sessionStorage
    try { 
      sessionStorage.setItem(key, value); 
      console.log(`[Storage] ✓ Saved to sessionStorage`); 
    } catch (e) { 
      console.log('[Storage] sessionStorage failed:', e); 
    }
    
    // Cookie (MOST RELIABLE for mobile redirects!)
    try {
      // Set cookie with 1 hour expiry, SameSite=Lax for redirect compatibility
      document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=3600; SameSite=Lax`;
      console.log(`[Storage] ✓ Saved to cookie`);
    } catch (e) {
      console.log('[Storage] cookie failed:', e);
    }
  }
  
  // AsyncStorage
  try { 
    await AsyncStorage.setItem(key, value); 
    console.log(`[Storage] ✓ Saved to AsyncStorage`); 
  } catch (e) { 
    console.log('[Storage] AsyncStorage failed:', e); 
  }
}

async function getFromStorage(key: string): Promise<string | null> {
  console.log(`[Storage] Reading ${key}...`);
  
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Try localStorage
    try { 
      const v = localStorage.getItem(key); 
      if (v) { console.log(`[Storage] ✓ Found in localStorage`); return v; }
    } catch {}
    
    // Try sessionStorage  
    try { 
      const v = sessionStorage.getItem(key); 
      if (v) { console.log(`[Storage] ✓ Found in sessionStorage`); return v; }
    } catch {}
    
    // Try cookie (MOST RELIABLE for mobile!)
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, ...valueParts] = cookie.trim().split('=');
        if (name === key && valueParts.length > 0) {
          const v = decodeURIComponent(valueParts.join('='));
          if (v) { console.log(`[Storage] ✓ Found in cookie`); return v; }
        }
      }
    } catch {}
  }
  
  // Try AsyncStorage (last resort)
  try {
    const v = await AsyncStorage.getItem(key);
    if (v) { console.log(`[Storage] ✓ Found in AsyncStorage`); return v; }
  } catch {}
  
  console.log(`[Storage] ✗ ${key} not found anywhere`);
  return null;
}

async function clearFromStorage(key: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { localStorage.removeItem(key); } catch {}
    try { sessionStorage.removeItem(key); } catch {}
  }
  try { await AsyncStorage.removeItem(key); } catch {}
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
  
  // Guard against double connect
  const connectCalled = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  // ─── Set wallet as connected ───────────────────────────────
  const setWalletConnected = useCallback((addr: string) => {
    console.log('[Wallet] ✅ CONNECTED:', addr);
    saveToStorage(WALLET_KEY, addr);
    setAddress(addr);
    setConnected(true);
  }, []);

  // ─── Process callback from Phantom (NO connect() call!) ────
  const processCallback = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    
    const url = window.location.href;
    console.log('[Wallet] Full URL on load:', url);
    
    if (!url.includes('phantom_encryption_public_key') && !url.includes('errorCode')) {
      console.log('[Wallet] No Phantom callback params in URL');
      return false;
    }
    
    console.log('[Wallet] ======= PROCESSING PHANTOM CALLBACK =======');
    
    const params = new URLSearchParams(window.location.search);
    
    // Log all params
    console.log('[Wallet] phantom_encryption_public_key:', params.get('phantom_encryption_public_key')?.substring(0, 20) + '...');
    console.log('[Wallet] nonce:', params.get('nonce')?.substring(0, 20) + '...');
    console.log('[Wallet] data:', params.get('data')?.substring(0, 20) + '...');
    console.log('[Wallet] errorCode:', params.get('errorCode'));
    
    // Check for error BEFORE cleaning URL
    if (params.get('errorCode')) {
      console.log('[Wallet] Phantom returned error:', params.get('errorMessage'));
      setError(params.get('errorMessage') || 'Cancelled');
      // Clean URL
      window.history.replaceState({}, '', window.location.origin + window.location.pathname);
      return false;
    }
    
    const phantomPubKey = params.get('phantom_encryption_public_key');
    const nonce = params.get('nonce');
    const data = params.get('data');
    
    if (!phantomPubKey || !nonce || !data) {
      console.log('[Wallet] ERROR: Missing required callback params');
      // Clean URL
      window.history.replaceState({}, '', window.location.origin + window.location.pathname);
      return false;
    }
    
    // Get keypair from storage BEFORE cleaning URL
    console.log('[Wallet] Attempting to retrieve keypair from storage...');
    const keypairJson = await getFromStorage(KEYPAIR_KEY);
    
    // NOW clean URL
    window.history.replaceState({}, '', window.location.origin + window.location.pathname);
    
    if (!keypairJson) {
      console.log('[Wallet] ❌ CRITICAL ERROR: No keypair found in ANY storage!');
      console.log('[Wallet] This means localStorage, sessionStorage, and AsyncStorage are all empty.');
      console.log('[Wallet] The keypair was lost during the redirect to Phantom.');
      setError('Connection failed. Please try again.');
      return false;
    }
    
    console.log('[Wallet] ✓ Keypair found! Length:', keypairJson.length);
    
    try {
      await ensureCrypto();
      console.log('[Wallet] Crypto loaded, starting decryption...');
      
      const keypair = JSON.parse(keypairJson);
      console.log('[Wallet] Keypair parsed, pub length:', keypair.pub?.length, 'sec length:', keypair.sec?.length);
      
      const secretKey = new Uint8Array(keypair.sec);
      
      const phantomBytes = bs58.decode(phantomPubKey);
      const nonceBytes = bs58.decode(nonce);
      const dataBytes = bs58.decode(data);
      
      console.log('[Wallet] Decoded - phantom:', phantomBytes.length, 'nonce:', nonceBytes.length, 'data:', dataBytes.length);
      
      const sharedSecret = nacl.box.before(phantomBytes, secretKey);
      console.log('[Wallet] Shared secret computed');
      
      const decrypted = nacl.box.open.after(dataBytes, nonceBytes, sharedSecret);
      
      if (!decrypted) {
        console.log('[Wallet] ❌ Decryption returned null - keypair mismatch!');
        console.log('[Wallet] The stored keypair does not match what was sent to Phantom.');
        setError('Connection failed. Please try again.');
        return false;
      }
      
      console.log('[Wallet] ✓ Decryption successful!');
      const payload = JSON.parse(Buffer.from(decrypted).toString('utf8'));
      console.log('[Wallet] Payload:', JSON.stringify(payload).substring(0, 100));
      
      // SUCCESS - persist publicKey
      await clearFromStorage(KEYPAIR_KEY);
      setWalletConnected(payload.public_key);
      console.log('[Wallet] ======= CONNECTION COMPLETE =======');
      return true;
      
    } catch (err: any) {
      console.error('[Wallet] ❌ Callback processing error:', err?.message || err);
      console.error('[Wallet] Error stack:', err?.stack);
      setError('Connection failed. Please try again.');
      return false;
    }
  }, [setWalletConnected]);

  // ─── Initialize: check storage and callback (NO connect!) ──
  useEffect(() => {
    const init = async () => {
      // FIRST: Check for existing publicKey in storage
      // If exists, wallet is connected - DO NOT reconnect
      const savedAddr = await getFromStorage(WALLET_KEY);
      if (savedAddr) {
        console.log('[Wallet] Found saved address:', savedAddr);
        setWalletConnected(savedAddr);
        return; // STOP - already connected
      }
      
      // SECOND: Check for Phantom callback in URL
      // This is NOT a connect() call - just reading the response
      const processed = await processCallback();
      if (processed) {
        return; // STOP - just connected via callback
      }
      
      // No auto-connect, no extension check, nothing else
      // User must click the button to connect
    };
    
    init();
  }, [processCallback, setWalletConnected]);

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
      console.log('[Wallet] Fetching balances...');
      
      const [qtm, sol, rate] = await Promise.all([
        getQuantumBalance(address),
        getSolBalance(address),
        getUsdToEurRate(),
      ]);

      console.log('[Wallet] Balance:', qtm.amount, 'QTM');
      
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

  // ─── Connect Wallet (ONLY from user click, ONLY once) ──────
  const connectWallet = useCallback(async () => {
    // HARD GUARD: Never connect if already connected or connecting
    if (connected || connecting || connectCalled.current) {
      console.log('[Wallet] Already connected or connecting, skipping');
      if (connected) await refreshBalances();
      return;
    }
    
    // HARD GUARD: Check storage
    const savedAddr = await getFromStorage(WALLET_KEY);
    if (savedAddr) {
      console.log('[Wallet] Found in storage, using that');
      setWalletConnected(savedAddr);
      return;
    }
    
    console.log('[Wallet] Connect clicked');
    connectCalled.current = true;
    setConnecting(true);
    setError(null);

    try {
      // TRY EXTENSION (desktop only)
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const solana = (window as any).solana;
        
        if (solana?.isPhantom) {
          console.log('[Wallet] Trying extension...');
          try {
            const resp = await solana.connect();
            setWalletConnected(resp.publicKey.toString());
            setConnecting(false);
            connectCalled.current = false;
            return;
          } catch (err: any) {
            if (err?.code === 4001) {
              setError('Connection rejected');
              setConnecting(false);
              connectCalled.current = false;
              return;
            }
            // Fall through to deep link
          }
        }
      }

      // MOBILE: Deep link
      console.log('[Wallet] Using deep link...');
      await ensureCrypto();
      
      const kp = nacl.box.keyPair();
      await saveToStorage(KEYPAIR_KEY, JSON.stringify({
        pub: Array.from(kp.publicKey),
        sec: Array.from(kp.secretKey),
      }));
      
      const dappPubKey = bs58.encode(kp.publicKey);
      const redirectUrl = window.location.origin + window.location.pathname;
      
      console.log('[Wallet] Keypair stored, redirecting...');
      console.log('[Wallet] Redirect URL:', redirectUrl);
      
      const params = new URLSearchParams({
        dapp_encryption_public_key: dappPubKey,
        cluster: 'mainnet-beta',
        app_url: redirectUrl,
        redirect_link: redirectUrl,
      });
      
      console.log('[Wallet] Opening Phantom...');
      window.location.href = `https://phantom.app/ul/v1/connect?${params}`;
      // Don't reset connectCalled - page will redirect
      
    } catch (err: any) {
      console.error('[Wallet] Error:', err);
      setError('Connection failed');
      setConnecting(false);
      connectCalled.current = false;
    }
  }, [connected, connecting, refreshBalances, setWalletConnected]);

  // ─── Disconnect ────────────────────────────────────────────
  const disconnectWallet = useCallback(async () => {
    console.log('[Wallet] Disconnecting...');
    
    // Try to disconnect from extension
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try { 
        const solana = (window as any).solana;
        if (solana?.disconnect) await solana.disconnect(); 
      } catch {}
    }
    
    setConnected(false);
    setAddress(null);
    setQuantumBalance(null);
    setSolBalance(0);
    setUsdValue(0);
    setEurValue(0);
    setError(null);
    connectCalled.current = false;
    
    clearFromStorage(WALLET_KEY);
    clearFromStorage(KEYPAIR_KEY);
    
    console.log('[Wallet] Disconnected');
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
