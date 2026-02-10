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
import { Buffer } from 'buffer';
import {
  getQuantumBalance,
  getSolBalance,
  getUsdToEurRate,
  QUANTUM_PRICE_USD,
  TokenBalance,
} from '../utils/solanaRpc';

// Lazy-load tweetnacl and bs58 to ensure PRNG polyfill is ready
let nacl: any = null;
let bs58Module: { encode: (buffer: Uint8Array | number[]) => string; decode: (str: string) => Uint8Array } | null = null;
let cryptoReady = false;

async function ensureCrypto(): Promise<void> {
  if (cryptoReady) return;
  
  if (!nacl) {
    const naclMod = await import('tweetnacl');
    nacl = naclMod.default || naclMod;
    console.log('[Crypto] tweetnacl loaded');
  }
  if (!bs58Module) {
    const mod = await import('bs58');
    bs58Module = mod.default || mod;
    console.log('[Crypto] bs58 loaded');
  }
  cryptoReady = true;
}

// Helper functions
async function bs58Encode(buffer: Uint8Array | number[]): Promise<string> {
  await ensureCrypto();
  return bs58Module!.encode(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
}

async function bs58Decode(str: string): Promise<Uint8Array> {
  await ensureCrypto();
  return new Uint8Array(bs58Module!.decode(str));
}

// Ensure auth session completes properly
WebBrowser.maybeCompleteAuthSession();

// ─── Storage Keys ───────────────────────────────────────────
const WALLET_KEY = 'walletAddress';
const KEYPAIR_PUBLIC_KEY = 'phantom_dapp_public_key';
const KEYPAIR_SECRET_KEY = 'phantom_dapp_secret_key';

// ─── Web localStorage helpers (more reliable for redirects) ─
function webStorageSet(key: string, value: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(key, value);
  }
}

function webStorageGet(key: string): string | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(key);
  }
  return null;
}

function webStorageRemove(key: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(key);
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

  // In-memory keypair reference
  const dappKeyPair = useRef<{ publicKey: Uint8Array; secretKey: Uint8Array } | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // ─── Get or create keypair (persisted for redirects) ──────
  const getOrCreateKeyPair = useCallback(async () => {
    await ensureCrypto();
    
    // Try memory first
    if (dappKeyPair.current) {
      console.log('[Wallet] Using keypair from memory');
      return dappKeyPair.current;
    }
    
    // On web, use localStorage (synchronous, survives redirects)
    if (Platform.OS === 'web') {
      const storedPub = webStorageGet(KEYPAIR_PUBLIC_KEY);
      const storedSec = webStorageGet(KEYPAIR_SECRET_KEY);
      
      if (storedPub && storedSec) {
        try {
          const publicKey = await bs58Decode(storedPub);
          const secretKey = await bs58Decode(storedSec);
          dappKeyPair.current = { publicKey, secretKey };
          console.log('[Wallet] Restored keypair from localStorage, pubKey:', storedPub.substring(0, 8) + '...');
          return dappKeyPair.current;
        } catch (e) {
          console.error('[Wallet] Failed to decode stored keypair:', e);
          // Clear corrupted data
          webStorageRemove(KEYPAIR_PUBLIC_KEY);
          webStorageRemove(KEYPAIR_SECRET_KEY);
        }
      }
    } else {
      // Mobile: use AsyncStorage
      try {
        const storedPub = await AsyncStorage.getItem(KEYPAIR_PUBLIC_KEY);
        const storedSec = await AsyncStorage.getItem(KEYPAIR_SECRET_KEY);
        
        if (storedPub && storedSec) {
          const publicKey = await bs58Decode(storedPub);
          const secretKey = await bs58Decode(storedSec);
          dappKeyPair.current = { publicKey, secretKey };
          console.log('[Wallet] Restored keypair from AsyncStorage');
          return dappKeyPair.current;
        }
      } catch (e) {
        console.warn('[Wallet] Failed to restore keypair:', e);
      }
    }
    
    // Generate new keypair
    console.log('[Wallet] Generating new keypair...');
    const kp = nacl.box.keyPair();
    dappKeyPair.current = kp;
    
    // Persist for redirect flows
    try {
      const pubB58 = await bs58Encode(Array.from(kp.publicKey));
      const secB58 = await bs58Encode(Array.from(kp.secretKey));
      
      if (Platform.OS === 'web') {
        webStorageSet(KEYPAIR_PUBLIC_KEY, pubB58);
        webStorageSet(KEYPAIR_SECRET_KEY, secB58);
        console.log('[Wallet] New keypair stored in localStorage, pubKey:', pubB58.substring(0, 8) + '...');
      } else {
        await AsyncStorage.setItem(KEYPAIR_PUBLIC_KEY, pubB58);
        await AsyncStorage.setItem(KEYPAIR_SECRET_KEY, secB58);
        console.log('[Wallet] New keypair stored in AsyncStorage');
      }
    } catch (e) {
      console.error('[Wallet] Failed to persist keypair:', e);
    }
    
    return dappKeyPair.current;
  }, []);

  // ─── Decrypt Phantom response ──────────────────────────────
  const decryptPhantomResponse = useCallback(async (params: URLSearchParams): Promise<string | null> => {
    try {
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
        console.log('[Wallet] Missing params:', { phantomPubKeyStr: !!phantomPubKeyStr, nonceStr: !!nonceStr, dataStr: !!dataStr });
        throw new Error('Missing Phantom response parameters.');
      }

      console.log('[Wallet] Decrypting Phantom response...');

      // Ensure crypto is loaded
      await ensureCrypto();

      // Decode bs58 values
      const phantomPubKey = await bs58Decode(phantomPubKeyStr);
      const nonce = await bs58Decode(nonceStr);
      const encryptedData = await bs58Decode(dataStr);

      // Get our keypair (must be the same one used to initiate connection)
      const kp = await getOrCreateKeyPair();

      // Derive shared secret using X25519
      const sharedSecret = nacl.box.before(phantomPubKey, kp.secretKey);

      // Decrypt the response
      const decrypted = nacl.box.open.after(encryptedData, nonce, sharedSecret);

      if (!decrypted) {
        throw new Error('Decryption failed — keypair mismatch. Please try connecting again.');
      }

      const payload = JSON.parse(Buffer.from(decrypted).toString('utf8'));
      console.log('[Wallet] Decrypted payload:', JSON.stringify(payload).substring(0, 100));

      return payload.public_key;
    } catch (err: any) {
      console.error('[Wallet] Decrypt error:', err?.message);
      throw err;
    }
  }, [getOrCreateKeyPair]);

  // ─── Check URL for Phantom callback (web redirect flow) ───
  const checkForPhantomCallback = useCallback(async () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    
    // Check if this is a Phantom callback
    if (params.has('phantom_encryption_public_key') || params.has('errorCode')) {
      console.log('[Wallet] ========== PHANTOM CALLBACK DETECTED ==========');
      console.log('[Wallet] URL:', window.location.href.substring(0, 100) + '...');
      console.log('[Wallet] Has phantom_encryption_public_key:', params.has('phantom_encryption_public_key'));
      console.log('[Wallet] Has errorCode:', params.has('errorCode'));
      
      // Check if we have a stored keypair
      const storedPub = webStorageGet(KEYPAIR_PUBLIC_KEY);
      console.log('[Wallet] Stored keypair exists:', !!storedPub);
      if (storedPub) {
        console.log('[Wallet] Stored pubKey:', storedPub.substring(0, 12) + '...');
      }
      
      setConnecting(true);
      
      try {
        if (params.has('errorCode')) {
          const errMsg = params.get('errorMessage') || 'Connection rejected.';
          console.log('[Wallet] Phantom returned error:', errMsg);
          setError(errMsg);
        } else {
          console.log('[Wallet] Attempting to decrypt response...');
          const walletAddress = await decryptPhantomResponse(params);
          if (walletAddress) {
            setConnected(true);
            setAddress(walletAddress);
            await AsyncStorage.setItem(WALLET_KEY, walletAddress);
            console.log('[Wallet] SUCCESS! Connected via redirect:', walletAddress);
            
            // Clear the keypair after successful connection
            webStorageRemove(KEYPAIR_PUBLIC_KEY);
            webStorageRemove(KEYPAIR_SECRET_KEY);
          }
        }
      } catch (err: any) {
        console.error('[Wallet] Callback processing error:', err);
        setError(err?.message || 'Connection failed.');
        
        // Clear keypair on error so user can try fresh
        webStorageRemove(KEYPAIR_PUBLIC_KEY);
        webStorageRemove(KEYPAIR_SECRET_KEY);
      } finally {
        setConnecting(false);
        
        // Clean URL by removing Phantom params
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        console.log('[Wallet] ========== CALLBACK PROCESSING COMPLETE ==========');
      }
    }
  }, [decryptPhantomResponse]);
    }
  }, [decryptPhantomResponse]);

  // ─── Initialize: preload crypto & check for callback ──────
  useEffect(() => {
    const init = async () => {
      // Preload crypto libraries immediately
      await ensureCrypto();
      
      // Check for Phantom callback in URL
      await checkForPhantomCallback();
      
      // Restore previous session if no callback
      if (!connected) {
        await restoreSession();
      }
    };
    
    init();
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
      console.log('[Wallet] Session restored from storage');
    } catch (err) {
      console.error('[Wallet] Restore error:', err);
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
            if (err?.code === 4001) {
              setError('Connection rejected.');
              setConnecting(false);
              return;
            }
            // Extension failed, fall through to redirect flow
            console.log('[Wallet] Extension connect failed, trying redirect...');
          }
        }

        // ── WEB without extension: REDIRECT flow ──
        // Clear any old keypair to ensure fresh connection
        dappKeyPair.current = null;
        webStorageRemove(KEYPAIR_PUBLIC_KEY);
        webStorageRemove(KEYPAIR_SECRET_KEY);
        
        // Generate fresh keypair for this connection
        const kp = await getOrCreateKeyPair();
        const dappPubKeyB58 = await bs58Encode(Array.from(kp.publicKey));
        
        console.log('[Wallet] Fresh keypair for connection, pubKey:', dappPubKeyB58.substring(0, 12) + '...');
        
        const currentUrl = window.location.origin + window.location.pathname;

        const connectParams = new URLSearchParams({
          dapp_encryption_public_key: dappPubKeyB58,
          cluster: 'mainnet-beta',
          app_url: currentUrl,
          redirect_link: currentUrl,
        });

        const connectUrl = `https://phantom.app/ul/v1/connect?${connectParams.toString()}`;
        console.log('[Wallet] Redirecting to Phantom...');
        console.log('[Wallet] Redirect URL:', currentUrl);
        
        // Direct redirect - no popup needed
        window.location.href = connectUrl;
        return;
      }

      // ── MOBILE: use expo-web-browser ──
      const mobileKp = await getOrCreateKeyPair();
      const dappPubKeyB58 = await bs58Encode(Array.from(mobileKp.publicKey));
      const redirectUri = Linking.createURL('onConnect');

      console.log('[Wallet] Redirect URI:', redirectUri);

      const connectParams = new URLSearchParams({
        dapp_encryption_public_key: dappPubKeyB58,
        cluster: 'mainnet-beta',
        app_url: 'https://quantum-ia.com',
        redirect_link: redirectUri,
      });

      const connectUrl = `https://phantom.app/ul/v1/connect?${connectParams.toString()}`;

      console.log('[Wallet] Opening Phantom auth session...');

      const result = await WebBrowser.openAuthSessionAsync(connectUrl, redirectUri);

      console.log('[Wallet] Auth session result type:', result.type);

      if (result.type === 'success' && result.url) {
        console.log('[Wallet] Got redirect URL:', result.url.substring(0, 80) + '...');

        const resultUrl = new URL(result.url);
        const walletAddress = await decryptPhantomResponse(resultUrl.searchParams);

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
    
    // Clear stored data
    await AsyncStorage.removeItem(WALLET_KEY);
    // Keep keypair for future connections
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
