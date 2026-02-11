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

function saveToStorage(key: string, value: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { localStorage.setItem(key, value); } catch {}
    try { sessionStorage.setItem(key, value); } catch {}
  }
  AsyncStorage.setItem(key, value).catch(() => {});
}

function getFromStorage(key: string): string | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { 
      const v = localStorage.getItem(key); 
      if (v) return v; 
    } catch {}
    try { 
      const v = sessionStorage.getItem(key); 
      if (v) return v; 
    } catch {}
  }
  return null;
}

function clearFromStorage(key: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { localStorage.removeItem(key); } catch {}
    try { sessionStorage.removeItem(key); } catch {}
  }
  AsyncStorage.removeItem(key).catch(() => {});
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
    if (!url.includes('phantom_encryption_public_key') && !url.includes('errorCode')) {
      return false;
    }
    
    console.log('[Wallet] Processing Phantom callback...');
    
    const params = new URLSearchParams(window.location.search);
    
    // Clean URL immediately
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);
    
    // Check for error
    if (params.get('errorCode')) {
      console.log('[Wallet] User cancelled');
      setError(params.get('errorMessage') || 'Cancelled');
      return false;
    }
    
    const phantomPubKey = params.get('phantom_encryption_public_key');
    const nonce = params.get('nonce');
    const data = params.get('data');
    
    if (!phantomPubKey || !nonce || !data) {
      console.log('[Wallet] Missing callback params');
      return false;
    }
    
    // Get keypair from storage
    const keypairJson = getFromStorage(KEYPAIR_KEY);
    if (!keypairJson) {
      console.log('[Wallet] No keypair in storage');
      setError('Connection failed. Please try again.');
      return false;
    }
    
    try {
      await ensureCrypto();
      
      const keypair = JSON.parse(keypairJson);
      const secretKey = new Uint8Array(keypair.sec);
      
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
      
      // SUCCESS - persist publicKey
      clearFromStorage(KEYPAIR_KEY);
      setWalletConnected(payload.public_key);
      return true;
      
    } catch (err) {
      console.error('[Wallet] Callback error:', err);
      setError('Connection failed. Please try again.');
      return false;
    }
  }, [setWalletConnected]);

  // ─── Initialize: check storage and callback (NO connect!) ──
  useEffect(() => {
    const init = async () => {
      // FIRST: Check for existing publicKey in storage
      // If exists, wallet is connected - DO NOT reconnect
      const savedAddr = getFromStorage(WALLET_KEY);
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
    const savedAddr = getFromStorage(WALLET_KEY);
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
      saveToStorage(KEYPAIR_KEY, JSON.stringify({
        pub: Array.from(kp.publicKey),
        sec: Array.from(kp.secretKey),
      }));
      
      const dappPubKey = bs58.encode(kp.publicKey);
      const redirectUrl = window.location.origin + window.location.pathname;
      
      const params = new URLSearchParams({
        dapp_encryption_public_key: dappPubKey,
        cluster: 'mainnet-beta',
        app_url: redirectUrl,
        redirect_link: redirectUrl,
      });
      
      console.log('[Wallet] Redirecting to Phantom...');
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
