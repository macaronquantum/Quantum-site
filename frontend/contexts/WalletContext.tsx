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
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import {
  getQuantumBalance,
  getSolBalance,
  getUsdToEurRate,
  getBalancesViaBackend,
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

// Simple storage helpers
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
  setConnectedAddress: (address: string) => void;
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
  setConnectedAddress: () => {},
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
  const pendingKeypair = useRef<{ pub: Uint8Array; sec: Uint8Array } | null>(null);
  const clearError = useCallback(() => setError(null), []);

  // Set wallet connected (internal use)
  const setWalletConnected = useCallback((addr: string) => {
    console.log('[Wallet] CONNECTED:', addr);
    saveWallet(addr);
    setAddress(addr);
    setConnected(true);
    setConnecting(false);
    connectCalled.current = false;
  }, []);

  // Public method to set connected address (for callback page)
  const setConnectedAddress = useCallback((addr: string) => {
    console.log('[Wallet] Setting connected address from callback:', addr);
    saveWallet(addr);
    setAddress(addr);
    setConnected(true);
    setConnecting(false);
    connectCalled.current = false;
  }, []);

  // Initialize - check for saved wallet
  useEffect(() => {
    const init = async () => {
      console.log('[Wallet] Initializing...');
      const savedAddr = await getWallet();
      if (savedAddr) {
        console.log('[Wallet] Found saved address:', savedAddr);
        setWalletConnected(savedAddr);
      }
    };
    init();
  }, [setWalletConnected]);

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
      
      const backendData = await getBalancesViaBackend(address);
      
      if (backendData && backendData.quantum) {
        console.log('[Wallet] Backend proxy balance:', backendData.quantum.amount, 'QTM,', backendData.sol_balance, 'SOL');
        
        const qtm: TokenBalance = {
          amount: backendData.quantum.amount,
          rawAmount: backendData.quantum.rawAmount,
          decimals: backendData.quantum.decimals,
          uiAmountString: backendData.quantum.uiAmountString,
        };
        const sol = backendData.sol_balance;
        const rate = await getUsdToEurRate();
        
        setQuantumBalance(qtm);
        setSolBalance(sol);
        setEurRate(rate);
        setUsdValue(qtm.amount * QUANTUM_PRICE_USD);
        setEurValue(qtm.amount * QUANTUM_PRICE_USD * rate);
        return;
      }

      console.log('[Wallet] Falling back to direct RPC...');
      const results = await Promise.all([
        getQuantumBalance(address),
        getSolBalance(address),
        getUsdToEurRate(),
      ]);
      
      const qtm = results[0];
      const sol = results[1];
      const rate = results[2];

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

  // Handle Phantom deep link callback (native only)
  const handlePhantomCallback = useCallback(async (url: string) => {
    try {
      console.log('[Wallet] Phantom callback URL:', url);
      const kp = pendingKeypair.current;
      if (!kp) {
        console.log('[Wallet] No pending keypair, ignoring URL');
        return;
      }

      const parsed = Linking.parse(url);
      const params = parsed.queryParams || {};

      // Check for Phantom error
      if (params.errorCode) {
        const errMsg = params.errorMessage
          ? decodeURIComponent(params.errorMessage as string)
          : 'Connexion annulee';
        setError(`Phantom: ${errMsg}`);
        setConnecting(false);
        connectCalled.current = false;
        pendingKeypair.current = null;
        return;
      }

      const phantomPubKey = params.phantom_encryption_public_key as string;
      const nonce = params.nonce as string;
      const data = params.data as string;

      if (!phantomPubKey || !nonce || !data) {
        console.log('[Wallet] Missing Phantom params in callback, ignoring');
        return;
      }

      console.log('[Wallet] Decrypting Phantom response...');
      await ensureCrypto();

      const phantomBytes = bs58.decode(phantomPubKey);
      const nonceBytes = bs58.decode(nonce);
      const dataBytes = bs58.decode(data);
      const sharedSecret = nacl.box.before(phantomBytes, kp.sec);
      const decrypted = nacl.box.open.after(dataBytes, nonceBytes, sharedSecret);

      if (!decrypted) {
        setError('Echec de la decryption Phantom');
        setConnecting(false);
        connectCalled.current = false;
        pendingKeypair.current = null;
        return;
      }

      const payload = JSON.parse(Buffer.from(decrypted).toString('utf8'));
      console.log('[Wallet] Decrypted public_key:', payload.public_key);

      if (payload.public_key) {
        setWalletConnected(payload.public_key);
      } else {
        setError('Reponse Phantom invalide');
        setConnecting(false);
        connectCalled.current = false;
      }
      pendingKeypair.current = null;
    } catch (err: any) {
      console.error('[Wallet] Callback error:', err);
      setError(`ERREUR: ${err?.message || 'Inconnue'}`);
      setConnecting(false);
      connectCalled.current = false;
      pendingKeypair.current = null;
    }
  }, [setWalletConnected]);

  // Listen for deep link URLs on native (Phantom redirect)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const sub = Linking.addEventListener('url', (event) => {
      if (event.url && connectCalled.current) {
        handlePhantomCallback(event.url);
      }
    });

    return () => sub.remove();
  }, [handlePhantomCallback]);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    console.log('[Wallet] Connect clicked');
    
    if (connected || connecting || connectCalled.current) {
      console.log('[Wallet] Already connected/connecting');
      if (connected) await refreshBalances();
      return;
    }
    
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
              setError('Connexion rejetee par utilisateur');
              setConnecting(false);
              connectCalled.current = false;
              return;
            }
          }
        }
      }

      // Deep link flow
      console.log('[Wallet] Using deep link flow...');
      await ensureCrypto();
      
      const kp = nacl.box.keyPair();
      const dappPubKey = bs58.encode(kp.publicKey);

      if (Platform.OS === 'web') {
        // Web: server-side session + redirect
        const keypairJson = JSON.stringify({
          pub: Array.from(kp.publicKey),
          sec: Array.from(kp.secretKey),
        });
        
        const sessionResponse = await fetch(`${API_URL}/api/wallet/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keypair: keypairJson }),
        });
        
        if (!sessionResponse.ok) {
          throw new Error('Erreur serveur: impossible de creer la session');
        }
        
        const { session_id } = await sessionResponse.json();
        const baseUrl = window.location.origin;
        const redirectUrl = `${baseUrl}/connect/${session_id}`;
        
        const phantomParams = new URLSearchParams({
          dapp_encryption_public_key: dappPubKey,
          cluster: 'mainnet-beta',
          app_url: baseUrl,
          redirect_link: redirectUrl,
        });
        
        window.location.href = `https://phantom.app/ul/v1/connect?${phantomParams.toString()}`;
      } else {
        // Native: keep keypair in memory + AsyncStorage, use Linking.openURL to open Phantom app
        pendingKeypair.current = { pub: kp.publicKey, sec: kp.secretKey };
        await AsyncStorage.setItem('phantom_pending_keypair', JSON.stringify({
          pub: Array.from(kp.publicKey),
          sec: Array.from(kp.secretKey),
        }));
        
        const appUrl = Linking.createURL('');
        const redirectUrl = Linking.createURL('phantom-callback');
        console.log('[Wallet] Native redirect URL:', redirectUrl);
        
        const phantomParams = new URLSearchParams({
          dapp_encryption_public_key: dappPubKey,
          cluster: 'mainnet-beta',
          app_url: appUrl,
          redirect_link: redirectUrl,
        });
        
        const phantomUrl = `https://phantom.app/ul/v1/connect?${phantomParams.toString()}`;
        console.log('[Wallet] Opening Phantom app via deep link...');
        
        await Linking.openURL(phantomUrl);
      }
      
    } catch (err: any) {
      const errMsg = `ERREUR: ${err?.message || 'Inconnue'}`;
      console.error('[Wallet]', errMsg);
      setError(errMsg);
      setConnecting(false);
      connectCalled.current = false;
      pendingKeypair.current = null;
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
    pendingKeypair.current = null;
    
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
        setConnectedAddress,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
