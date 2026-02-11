import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
  useWallet as useSolanaWallet,
  useConnection,
} from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import {
  getQuantumBalance,
  getSolBalance,
  getUsdToEurRate,
  QUANTUM_PRICE_USD,
  TokenBalance,
} from '../utils/solanaRpc';

// ─── Constants ──────────────────────────────────────────────
const WALLET_KEY = 'quantum_wallet_address';
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

// ─── Storage helpers ────────────────────────────────────────
async function persistAddress(address: string): Promise<void> {
  try {
    await AsyncStorage.setItem(WALLET_KEY, address);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem(WALLET_KEY, address);
    }
  } catch {}
}

async function getStoredAddress(): Promise<string | null> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const addr = window.localStorage.getItem(WALLET_KEY);
      if (addr) return addr;
    }
    return await AsyncStorage.getItem(WALLET_KEY);
  } catch {
    return null;
  }
}

async function clearStoredAddress(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WALLET_KEY);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.removeItem(WALLET_KEY);
    }
  } catch {}
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

// ─── Inner Provider (uses wallet-adapter hooks) ─────────────
function WalletContextInner({ children }: { children: ReactNode }) {
  const { 
    publicKey, 
    connected: walletConnected, 
    connecting: walletConnecting,
    connect,
    disconnect,
    wallet,
    select,
    wallets,
  } = useSolanaWallet();
  
  const [address, setAddress] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [quantumBalance, setQuantumBalance] = useState<TokenBalance | null>(null);
  const [solBalance, setSolBalance] = useState(0);
  const [usdValue, setUsdValue] = useState(0);
  const [eurValue, setEurValue] = useState(0);
  const [eurRate, setEurRate] = useState(0.92);
  const [loadingBalances, setLoadingBalances] = useState(false);

  const clearError = useCallback(() => setError(null), []);

  // ─── Sync with wallet-adapter state ────────────────────────
  useEffect(() => {
    if (publicKey) {
      const addr = publicKey.toString();
      console.log('[Wallet] ✅ CONNECTED:', addr);
      setAddress(addr);
      setConnected(true);
      persistAddress(addr);
    } else if (!walletConnecting) {
      // Only reset if not currently connecting
      if (connected) {
        console.log('[Wallet] Disconnected');
      }
    }
  }, [publicKey, walletConnecting]);

  // ─── Restore from storage on mount ─────────────────────────
  useEffect(() => {
    const restore = async () => {
      const storedAddr = await getStoredAddress();
      if (storedAddr && !publicKey) {
        console.log('[Wallet] Restored address from storage:', storedAddr);
        setAddress(storedAddr);
        setConnected(true);
      }
    };
    restore();
  }, []);

  // ─── Fetch balances when connected ─────────────────────────
  useEffect(() => {
    if (connected && address) {
      refreshBalances();
    } else if (!connected) {
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
  const connectWallet = useCallback(async () => {
    console.log('[Wallet] Connect button clicked');
    
    // If already connected via storage, just refresh
    if (connected && address) {
      console.log('[Wallet] Already connected, refreshing balances');
      await refreshBalances();
      return;
    }
    
    setConnecting(true);
    setError(null);

    try {
      // Select Phantom wallet
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
      if (phantomWallet) {
        console.log('[Wallet] Selecting Phantom wallet...');
        select(phantomWallet.adapter.name);
        
        // Small delay for selection to take effect
        await new Promise(r => setTimeout(r, 100));
        
        console.log('[Wallet] Connecting...');
        await connect();
      } else {
        console.log('[Wallet] No Phantom wallet found');
        setError('Phantom wallet not available');
      }
    } catch (err: any) {
      console.error('[Wallet] Connect error:', err);
      if (err?.name === 'WalletNotReadyError') {
        setError('Please install Phantom wallet');
      } else if (err?.name === 'WalletConnectionError') {
        setError('Connection failed. Please try again.');
      } else {
        setError(err?.message || 'Connection failed');
      }
    } finally {
      setConnecting(false);
    }
  }, [connected, address, wallets, select, connect, refreshBalances]);

  // ─── Disconnect Wallet ─────────────────────────────────────
  const disconnectWallet = useCallback(async () => {
    console.log('[Wallet] Disconnecting...');
    
    try {
      await disconnect();
    } catch {}
    
    setConnected(false);
    setAddress(null);
    setQuantumBalance(null);
    setSolBalance(0);
    setUsdValue(0);
    setEurValue(0);
    setError(null);
    
    await clearStoredAddress();
    console.log('[Wallet] ✅ Disconnected');
  }, [disconnect]);

  const votingPower = quantumBalance ? Math.floor(quantumBalance.amount) : 0;

  return (
    <WalletContext.Provider
      value={{
        connected,
        address,
        connecting: connecting || walletConnecting,
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

// ─── Outer Provider (sets up wallet-adapter) ────────────────
export function WalletProvider({ children }: { children: ReactNode }) {
  // Only use Phantom adapter
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  
  // Endpoint for mainnet-beta
  const endpoint = useMemo(() => RPC_ENDPOINT, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        <WalletContextInner>{children}</WalletContextInner>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
