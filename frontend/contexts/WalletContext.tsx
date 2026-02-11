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

// API URL for server-side session storage
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Storage key for wallet address
const WALLET_KEY = 'quantum_wallet';

// Simple storage helpers for wallet address only
async function saveWallet(address: string): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(WALLET_KEY, address);
    }
    await AsyncStorage.setItem(WALLET_KEY, address);
  } catch (e) {
    console.log('[Storage] Save error:', e);
  }
}

async function getWallet(): Promise<string | null> {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(WALLET_KEY);
      if (v) return v;
    }
    return await AsyncStorage.getItem(WALLET_KEY);
  } catch (e) {
    return null;
  }
}

async function clearWallet(): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(WALLET_KEY);
    }
    await AsyncStorage.removeItem(WALLET_KEY);
  } catch (e) {}
}

// Types
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
  
  const connectCalled = useRef(false);
  const clearError = useCallback(() => setError(null), []);

  // Set wallet connected
  const setWalletConnected = useCallback((addr: string) => {
    console.log('[Wallet] CONNECTED:', addr);
    saveWallet(addr);
    setAddress(addr);
    setConnected(true);
    setConnecting(false);
    connectCalled.current = false;
  }, []);

  // Process Phantom callback - called when returning from Phantom with URL params
  const processPhantomCallback = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    
    const fullUrl = window.location.href;
    const params = new URLSearchParams(window.location.search);
    
    // Check if this is a Phantom callback
    const phantomPubKey = params.get('phantom_encryption_public_key');
    const errorCode = params.get('errorCode');
    const sessionId = params.get('sid');
    
    // Not a Phantom callback
    if (!phantomPubKey && !errorCode) {
      return false;
    }
    
    console.log('[Wallet] PHANTOM CALLBACK DETECTED');
    console.log('[Wallet] Full URL:', fullUrl);
    console.log('[Wallet] Session ID from URL:', sessionId);
    
    // Log all params for debugging
    const allParams: string[] = [];
    params.forEach((v, k) => allParams.push(`${k}=${v.substring(0, 30)}...`));
    console.log('[Wallet] All params:', allParams.join(', '));
    
    // Check for Phantom error first
    if (errorCode) {
      const errMsg = params.get('errorMessage') || 'Connexion annulée';
      // Clean URL
      window.history.replaceState({}, '', window.location.origin + window.location.pathname);
      setError(`PHANTOM ERREUR (${errorCode}): ${decodeURIComponent(errMsg)}`);
      return false;
    }
    
    const nonce = params.get('nonce');
    const data = params.get('data');
    
    // Clean URL now
    window.history.replaceState({}, '', window.location.origin + window.location.pathname);
    
    if (!phantomPubKey || !nonce || !data) {
      setError(`ERREUR: Paramètres Phantom manquants.\n\nReçu:\n• phantom_encryption_public_key: ${phantomPubKey ? 'OUI' : 'NON'}\n• nonce: ${nonce ? 'OUI' : 'NON'}\n• data: ${data ? 'OUI' : 'NON'}`);
      return false;
    }
    
    if (!sessionId) {
      setError(`ERREUR: Session ID (sid) manquant dans l'URL de retour.\n\nURL reçue: ${fullUrl.substring(0, 150)}...\n\nPhantom a peut-être supprimé le paramètre 'sid' de l'URL.`);
      return false;
    }
    
    console.log('[Wallet] Fetching keypair from server...');
    
    try {
      // Fetch keypair from server using session ID
      const response = await fetch(`${API_URL}/api/wallet/session/${sessionId}`);
      const result = await response.json();
      
      if (result.error || !result.keypair) {
        setError(`ERREUR SERVEUR: ${result.error || 'Keypair introuvable'}`);
        return false;
      }
      
      console.log('[Wallet] Keypair retrieved from server!');
      
      await ensureCrypto();
      
      const keypair = JSON.parse(result.keypair);
      const secretKey = new Uint8Array(keypair.sec);
      const phantomBytes = bs58.decode(phantomPubKey);
      const nonceBytes = bs58.decode(nonce);
      const dataBytes = bs58.decode(data);
      
      console.log('[Wallet] Decrypting...');
      
      const sharedSecret = nacl.box.before(phantomBytes, secretKey);
      const decrypted = nacl.box.open.after(dataBytes, nonceBytes, sharedSecret);
      
      if (!decrypted) {
        setError('ERREUR DECRYPTION: La décryption a échoué');
        return false;
      }
      
      const payload = JSON.parse(Buffer.from(decrypted).toString('utf8'));
      
      if (!payload.public_key) {
        setError('ERREUR: Pas de public_key dans la réponse Phantom');
        return false;
      }
      
      console.log('[Wallet] SUCCESS! Public key:', payload.public_key);
      setWalletConnected(payload.public_key);
      return true;
      
    } catch (err: any) {
      setError(`ERREUR TECHNIQUE: ${err?.message || 'Inconnue'}`);
      return false;
    }
  }, [setWalletConnected]);

  // Initialize - check for saved wallet or Phantom callback
  useEffect(() => {
    const init = async () => {
      console.log('[Wallet] Initializing...');
      
      // First check for Phantom callback
      const wasCallback = await processPhantomCallback();
      if (wasCallback) return;
      
      // Then check for saved wallet
      const savedAddr = await getWallet();
      if (savedAddr) {
        console.log('[Wallet] Found saved address:', savedAddr);
        setWalletConnected(savedAddr);
      }
    };
    
    init();
  }, [processPhantomCallback, setWalletConnected]);

  // Fetch balances when connected
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

  const refreshBalances = useCallback(async () => {
    if (!address) return;
    setLoadingBalances(true);

    try {
      console.log('[Wallet] Fetching balances for', address);
      
      const results = await Promise.all([
        getQuantumBalance(address),
        getSolBalance(address),
        getUsdToEurRate(),
      ]);
      
      const qtm = results[0];
      const sol = results[1];
      const rate = results[2];

      console.log('[Wallet] Balance:', qtm.amount, 'QTM,', sol, 'SOL');
      
      setQuantumBalance(qtm);
      setSolBalance(sol);
      setEurRate(rate);
      setUsdValue(qtm.amount * QUANTUM_PRICE_USD);
      setEurValue(qtm.amount * QUANTUM_PRICE_USD * rate);
    } catch (err: any) {
      console.error('[Wallet] Balance error:', err?.message);
    } finally {
      setLoadingBalances(false);
    }
  }, [address]);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    console.log('[Wallet] Connect clicked');
    
    if (connected || connecting || connectCalled.current) {
      console.log('[Wallet] Already connected/connecting');
      if (connected) await refreshBalances();
      return;
    }
    
    // Check for saved wallet first
    const savedAddr = await getWallet();
    if (savedAddr) {
      console.log('[Wallet] Found saved, using it');
      setWalletConnected(savedAddr);
      return;
    }
    
    connectCalled.current = true;
    setConnecting(true);
    setError(null);

    try {
      // Try browser extension first (desktop)
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const solana = (window as any).solana;
        if (solana?.isPhantom) {
          console.log('[Wallet] Trying extension...');
          try {
            const resp = await solana.connect();
            setWalletConnected(resp.publicKey.toString());
            return;
          } catch (err: any) {
            if (err?.code === 4001) {
              setError('Connexion rejetée par utilisateur');
              setConnecting(false);
              connectCalled.current = false;
              return;
            }
            // Extension failed, continue to deep link
          }
        }
      }

      // Deep link flow with server-side session
      console.log('[Wallet] Using deep link with server session...');
      await ensureCrypto();
      
      // Generate keypair
      const kp = nacl.box.keyPair();
      const keypairJson = JSON.stringify({
        pub: Array.from(kp.publicKey),
        sec: Array.from(kp.secretKey),
      });
      
      // Store keypair on server and get session ID
      console.log('[Wallet] Storing keypair on server...');
      const sessionResponse = await fetch(`${API_URL}/api/wallet/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keypair: keypairJson }),
      });
      
      if (!sessionResponse.ok) {
        throw new Error('Failed to create session on server');
      }
      
      const { session_id } = await sessionResponse.json();
      console.log('[Wallet] Session ID:', session_id);
      
      // Build redirect URL with session ID IN THE PATH (not query param)
      // This way Phantom cannot strip it
      const dappPubKey = bs58.encode(kp.publicKey);
      const baseUrl = Platform.OS === 'web' 
        ? window.location.origin
        : Linking.createURL('');
      
      // Use path-based session ID: /connect/abc12345
      const redirectUrl = `${baseUrl}/connect/${session_id}`;
      
      const phantomParams = new URLSearchParams({
        dapp_encryption_public_key: dappPubKey,
        cluster: 'mainnet-beta',
        app_url: baseUrl,
        redirect_link: redirectUrl,
      });
      
      const phantomUrl = `https://phantom.app/ul/v1/connect?${phantomParams.toString()}`;
      console.log('[Wallet] Redirecting to Phantom...');
      
      if (Platform.OS === 'web') {
        // Redirect to Phantom
        window.location.href = phantomUrl;
      } else {
        // Native: use WebBrowser
        const result = await WebBrowser.openAuthSessionAsync(phantomUrl, redirectUrl);
        if (result.type === 'success' && result.url) {
          const nativeParams = new URLSearchParams(new URL(result.url).search);
          // Process would happen via URL params
        }
        setConnecting(false);
        connectCalled.current = false;
      }
      
    } catch (err: any) {
      const errMsg = `ERREUR CONNECT: ${err?.message || 'Inconnue'}`;
      console.error('[Wallet]', errMsg);
      setError(errMsg);
      setConnecting(false);
      connectCalled.current = false;
    }
  }, [connected, connecting, refreshBalances, setWalletConnected]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    console.log('[Wallet] Disconnecting...');
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try { 
        const solana = (window as any).solana;
        if (solana?.disconnect) await solana.disconnect(); 
      } catch (e) {}
    }
    
    setConnected(false);
    setAddress(null);
    setQuantumBalance(null);
    setSolBalance(0);
    setUsdValue(0);
    setEurValue(0);
    setError(null);
    connectCalled.current = false;
    
    await clearWallet();
    
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
