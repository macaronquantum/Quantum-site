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

async function ensureCrypto() {
  if (!nacl) {
    const naclMod = await import('tweetnacl');
    nacl = naclMod.default || naclMod;
    console.log('[Crypto] tweetnacl loaded');
  }
  if (!bs58Module) {
    const mod = await import('bs58');
    // Handle both ESM default export and CommonJS module
    bs58Module = mod.default || mod;
    console.log('[Crypto] bs58 loaded, encode exists:', typeof bs58Module?.encode);
  }
}

// Helper functions that ensure crypto is loaded before use
async function bs58Encode(buffer: Uint8Array | number[]): Promise<string> {
  await ensureCrypto();
  if (!bs58Module) throw new Error('bs58 not loaded');
  return bs58Module.encode(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
}

async function bs58Decode(str: string): Promise<Uint8Array> {
  await ensureCrypto();
  if (!bs58Module) throw new Error('bs58 not loaded');
  return new Uint8Array(bs58Module.decode(str));
}

// Ensure auth session completes properly
WebBrowser.maybeCompleteAuthSession();

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

const WALLET_KEY = 'walletAddress';

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

  // Keypair generated lazily to ensure PRNG polyfill is loaded
  const dappKeyPair = useRef<{ publicKey: Uint8Array; secretKey: Uint8Array } | null>(null);

  const getOrCreateKeyPair = useCallback(async () => {
    await ensureCrypto();
    if (!dappKeyPair.current) {
      dappKeyPair.current = nacl.box.keyPair();
    }
    return dappKeyPair.current;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // ─── Restore session on mount ──────────────────────────────
  useEffect(() => {
    restoreSession();
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
      // Don't set error — wallet IS connected, RPC is just slow
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
    } catch (err) {
      console.error('[Wallet] Restore error:', err);
    }
  };

  // ─── Decrypt Phantom response ──────────────────────────────
  const decryptPhantomResponse = async (url: string): Promise<string | null> => {
    try {
      const parsedUrl = new URL(url);
      const params = parsedUrl.searchParams;

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
        throw new Error('Missing Phantom response parameters.');
      }

      // Decode bs58 values
      const phantomPubKey = await bs58Decode(phantomPubKeyStr);
      const nonce = await bs58Decode(nonceStr);
      const encryptedData = await bs58Decode(dataStr);

      console.log('[Wallet] Decrypting with keypair...');

      // Get our secret key
      const kp = await getOrCreateKeyPair();

      // Derive shared secret using X25519
      const sharedSecret = nacl.box.before(phantomPubKey, kp.secretKey);

      // Decrypt the response
      const decrypted = nacl.box.open.after(encryptedData, nonce, sharedSecret);

      if (!decrypted) {
        throw new Error('Decryption returned null — keypair mismatch.');
      }

      const payload = JSON.parse(Buffer.from(decrypted).toString('utf8'));
      console.log('[Wallet] Decrypted payload:', JSON.stringify(payload).substring(0, 100));

      return payload.public_key;
    } catch (err: any) {
      console.error('[Wallet] Decrypt error:', err?.message);
      throw err;
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
            setError(err?.code === 4001 ? 'Connection rejected.' : (err?.message || 'Failed.'));
            setConnecting(false);
            return;
          }
        }

        // Web without extension: open Phantom in popup, poll for redirect
        const currentUrl = window.location.origin + window.location.pathname;
        
        // CRITICAL: await the keypair and ensure crypto is loaded
        const webKp = await getOrCreateKeyPair();
        const dappPubKeyB58 = await bs58Encode(Array.from(webKp.publicKey));

        const connectParams = new URLSearchParams({
          dapp_encryption_public_key: dappPubKeyB58,
          cluster: 'mainnet-beta',
          app_url: currentUrl,
          redirect_link: currentUrl,
        });

        const connectUrl = `https://phantom.app/ul/v1/connect?${connectParams.toString()}`;
        console.log('[Wallet] Opening Phantom popup...');

        // Open popup window
        const popup = window.open(
          connectUrl,
          'phantom-connect',
          'width=420,height=700,top=100,left=100'
        );

        if (!popup) {
          setError('Popup blocked. Please allow popups for this site.');
          setConnecting(false);
          return;
        }

        // Poll the popup URL — when Phantom redirects back to our origin, we can read it
        const pollInterval = setInterval(() => {
          try {
            if (!popup || popup.closed) {
              clearInterval(pollInterval);
              setConnecting(false);
              return;
            }

            // Try to read the popup URL (only works when same origin)
            const popupUrl = popup.location.href;

            // If the popup redirected back to our origin with Phantom params
            if (
              popupUrl &&
              popupUrl.startsWith(currentUrl) &&
              popupUrl.includes('phantom_encryption_public_key')
            ) {
              clearInterval(pollInterval);
              popup.close();
              console.log('[Wallet] Got Phantom callback from popup');

              // Decrypt the response in async context
              (async () => {
                try {
                  const walletAddress = await decryptPhantomResponse(popupUrl);
                  if (walletAddress) {
                    setConnected(true);
                    setAddress(walletAddress);
                    await AsyncStorage.setItem(WALLET_KEY, walletAddress);
                    console.log('[Wallet] Connected via popup:', walletAddress);
                  }
                } catch (decryptErr: any) {
                  setError(decryptErr?.message || 'Decryption failed.');
                }
                setConnecting(false);
              })();
            }

            // Check for error redirect
            if (popupUrl && popupUrl.startsWith(currentUrl) && popupUrl.includes('errorCode')) {
              clearInterval(pollInterval);
              popup.close();
              const parsedPopup = new URL(popupUrl);
              setError(parsedPopup.searchParams.get('errorMessage') || 'Connection rejected.');
              setConnecting(false);
            }
          } catch {
            // Cross-origin — popup is still on phantom.app, keep polling
          }
        }, 500);

        // Safety timeout: stop polling after 2 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          if (connecting) {
            setConnecting(false);
          }
        }, 120000);

        return; // Keep connecting=true until popup returns
      }

      // ── MOBILE: use expo-web-browser (keeps app alive!) ──
      // CRITICAL: await the keypair and ensure crypto is loaded
      const mobileKp = await getOrCreateKeyPair();
      const dappPubKeyB58 = await bs58Encode(Array.from(mobileKp.publicKey));
      const redirectUri = Linking.createURL('onConnect');

      console.log('[Wallet] Redirect URI:', redirectUri);
      console.log('[Wallet] Dapp public key:', dappPubKeyB58.substring(0, 8) + '...');

      const connectParams = new URLSearchParams({
        dapp_encryption_public_key: dappPubKeyB58,
        cluster: 'mainnet-beta',
        app_url: 'https://quantum-ia.com',
        redirect_link: redirectUri,
      });

      const connectUrl = `https://phantom.app/ul/v1/connect?${connectParams.toString()}`;

      console.log('[Wallet] Opening Phantom auth session...');

      // openAuthSessionAsync opens a browser, waits for redirect back to our scheme,
      // and returns the result — the app stays alive, keypair stays in memory!
      const result = await WebBrowser.openAuthSessionAsync(connectUrl, redirectUri);

      console.log('[Wallet] Auth session result type:', result.type);

      if (result.type === 'success' && result.url) {
        console.log('[Wallet] Got redirect URL:', result.url.substring(0, 80) + '...');

        // CRITICAL: await the async decryption function
        const walletAddress = await decryptPhantomResponse(result.url);

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
    await AsyncStorage.removeItem(WALLET_KEY);
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
