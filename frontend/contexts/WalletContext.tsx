import 'react-native-get-random-values';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getQuantumBalance,
  getSolBalance,
  getUsdToEurRate,
  QUANTUM_PRICE_USD,
  TokenBalance,
} from '../utils/solanaRpc';

// ─── Storage Keys ───────────────────────────────────────────
const WALLET_KEY = 'walletAddress';

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

// ─── Get Phantom Provider (SIMPLE) ──────────────────────────
const getPhantomProvider = (): any | null => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  
  const provider = (window as any).solana;
  
  if (provider && provider.isPhantom) {
    console.log('[Wallet] Phantom provider detected');
    return provider;
  }
  
  console.log('[Wallet] Phantom provider NOT found');
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

  // ─── Restore session on mount ──────────────────────────────
  useEffect(() => {
    restoreSession();
    
    // Listen for Phantom account changes
    if (Platform.OS === 'web') {
      const provider = getPhantomProvider();
      if (provider) {
        provider.on('accountChanged', (publicKey: any) => {
          if (publicKey) {
            const newAddress = publicKey.toString();
            console.log('[Wallet] Account changed:', newAddress);
            setAddress(newAddress);
            AsyncStorage.setItem(WALLET_KEY, newAddress);
          } else {
            // User disconnected from Phantom
            console.log('[Wallet] Account disconnected');
            handleDisconnect();
          }
        });
      }
    }
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

      console.log('[Wallet] Token balance:', qtmBal.amount);
      console.log('[Wallet] SOL balance:', sol);
      console.log('[Wallet] EUR rate:', rate);
      
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

  // ─── Restore previous session ──────────────────────────────
  const restoreSession = async () => {
    try {
      // Try to silently reconnect via Phantom
      if (Platform.OS === 'web') {
        const provider = getPhantomProvider();
        if (provider) {
          try {
            // onlyIfTrusted: true means silent reconnect (no popup)
            const response = await provider.connect({ onlyIfTrusted: true });
            const publicKey = response.publicKey.toString();
            
            console.log('[Wallet] Session restored:', publicKey);
            setConnected(true);
            setAddress(publicKey);
            await AsyncStorage.setItem(WALLET_KEY, publicKey);
            return;
          } catch {
            // Not previously approved, that's fine
            console.log('[Wallet] No previous session to restore');
          }
        }
      }

      // Fallback: restore from stored address
      const storedAddress = await AsyncStorage.getItem(WALLET_KEY);
      if (storedAddress) {
        console.log('[Wallet] Restored address from storage:', storedAddress);
        setConnected(true);
        setAddress(storedAddress);
      }
    } catch (err) {
      console.error('[Wallet] Restore error:', err);
    }
  };

  // ─── Handle disconnect ─────────────────────────────────────
  const handleDisconnect = async () => {
    setConnected(false);
    setAddress(null);
    setQuantumBalance(null);
    setSolBalance(0);
    setUsdValue(0);
    setEurValue(0);
    setError(null);
    await AsyncStorage.removeItem(WALLET_KEY);
  };

  // ─── Connect Wallet (SIMPLE - INJECTED PROVIDER ONLY) ──────
  const connectWallet = async () => {
    console.log('[Wallet] Connect button clicked');
    
    if (connecting) return;
    setConnecting(true);
    setError(null);

    try {
      // ═══════════════════════════════════════════════════════
      // CHECK FOR INJECTED PROVIDER - NO REDIRECTS, NO DEEP LINKS
      // ═══════════════════════════════════════════════════════
      
      if (Platform.OS !== 'web' || typeof window === 'undefined') {
        setError('Web browser required.');
        return;
      }
      
      const solana = (window as any).solana;
      
      if (!solana || !solana.isPhantom) {
        console.log('[Wallet] Phantom wallet not detected');
        setError('NO_WALLET');
        // DO NOT redirect - just show error
        return;
      }

      // ═══════════════════════════════════════════════════════
      // THE ONLY VALID WAY TO CONNECT:
      // Just call solana.connect() - NO encryption, NO keypairs
      // ═══════════════════════════════════════════════════════
      
      console.log('[Wallet] Calling window.solana.connect()...');
      const response = await solana.connect();
      
      // Get the publicKey - THIS IS THE ONLY SOURCE OF TRUTH
      const publicKey = response.publicKey.toString();
      
      console.log('[Wallet] Wallet connected:', publicKey);
      
      // Store ONLY the publicKey (never store keypairs or secrets)
      setConnected(true);
      setAddress(publicKey);
      await AsyncStorage.setItem(WALLET_KEY, publicKey);
      
    } catch (err: any) {
      console.error('[Wallet] User rejected or connection failed:', err?.message || err);
      
      if (err?.code === 4001) {
        setError('Connection rejected by user.');
      } else {
        setError(err?.message || 'Connection failed.');
      }
    } finally {
      setConnecting(false);
    }
  };

  // ─── Disconnect ───────────────────────────────────────────
  const disconnectWallet = async () => {
    try {
      if (Platform.OS === 'web') {
        const provider = getPhantomProvider();
        if (provider) {
          await provider.disconnect();
          console.log('[Wallet] Disconnected from Phantom');
        }
      }
    } catch (err) {
      console.error('[Wallet] Disconnect error:', err);
    }
    
    await handleDisconnect();
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
