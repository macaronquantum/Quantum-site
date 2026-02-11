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

// Storage keys
const WALLET_KEY = 'quantum_wallet';
const KEYPAIR_KEY = 'quantum_keypair';

// Save to all storage
async function saveToStorage(key: string, value: string): Promise<void> {
  const logs: string[] = [];
  logs.push(`[Storage] Saving ${key}...`);
  
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { 
      localStorage.setItem(key, value); 
      logs.push('[Storage] Saved to localStorage');
    } catch (e: any) { 
      logs.push(`[Storage] localStorage FAILED: ${e?.message}`);
    }
    
    try { 
      sessionStorage.setItem(key, value); 
      logs.push('[Storage] Saved to sessionStorage');
    } catch (e: any) { 
      logs.push(`[Storage] sessionStorage FAILED: ${e?.message}`);
    }
    
    try {
      document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=3600; SameSite=Lax`;
      logs.push('[Storage] Saved to cookie');
    } catch (e: any) {
      logs.push(`[Storage] cookie FAILED: ${e?.message}`);
    }
  }
  
  try { 
    await AsyncStorage.setItem(key, value); 
    logs.push('[Storage] Saved to AsyncStorage');
  } catch (e: any) { 
    logs.push(`[Storage] AsyncStorage FAILED: ${e?.message}`);
  }
  
  console.log(logs.join('\n'));
}

// Get from any storage
async function getFromStorage(key: string): Promise<string | null> {
  console.log(`[Storage] Reading ${key}...`);
  
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { 
      const v = localStorage.getItem(key); 
      if (v) { 
        console.log(`[Storage] Found in localStorage`); 
        return v; 
      }
    } catch (e) {
      console.log('[Storage] localStorage read failed');
    }
    
    try { 
      const v = sessionStorage.getItem(key); 
      if (v) { 
        console.log(`[Storage] Found in sessionStorage`); 
        return v; 
      }
    } catch (e) {
      console.log('[Storage] sessionStorage read failed');
    }
    
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const parts = cookie.trim().split('=');
        if (parts[0] === key && parts.length > 1) {
          const v = decodeURIComponent(parts.slice(1).join('='));
          if (v) { 
            console.log(`[Storage] Found in cookie`); 
            return v; 
          }
        }
      }
    } catch (e) {
      console.log('[Storage] cookie read failed');
    }
  }
  
  try {
    const v = await AsyncStorage.getItem(key);
    if (v) { 
      console.log(`[Storage] Found in AsyncStorage`); 
      return v; 
    }
  } catch (e) {
    console.log('[Storage] AsyncStorage read failed');
  }
  
  console.log(`[Storage] ${key} NOT FOUND in any storage`);
  return null;
}

// Clear from all storage
async function clearFromStorage(key: string): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try { localStorage.removeItem(key); } catch (e) {}
    try { sessionStorage.removeItem(key); } catch (e) {}
    try { document.cookie = `${key}=; path=/; max-age=0`; } catch (e) {}
  }
  try { await AsyncStorage.removeItem(key); } catch (e) {}
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
    saveToStorage(WALLET_KEY, addr);
    setAddress(addr);
    setConnected(true);
  }, []);

  // Process Phantom callback
  const processCallback = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    
    const url = window.location.href;
    console.log('[Wallet] Checking URL for callback...');
    
    if (!url.includes('phantom_encryption_public_key') && !url.includes('errorCode')) {
      return false;
    }
    
    console.log('[Wallet] PHANTOM CALLBACK DETECTED');
    console.log('[Wallet] Full URL:', url);
    const params = new URLSearchParams(window.location.search);
    
    // DEBUG: Log all URL parameters
    const allParams: string[] = [];
    params.forEach((value, key) => {
      allParams.push(`${key}=${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
    });
    console.log('[Wallet] URL Params:', allParams.join(', '));
    
    // Check Phantom error
    if (params.get('errorCode')) {
      const errMsg = params.get('errorMessage') || 'Cancelled';
      const fullError = `PHANTOM ERREUR (${params.get('errorCode')}): ${errMsg}`;
      console.log('[Wallet]', fullError);
      setError(fullError);
      window.history.replaceState({}, '', window.location.origin + window.location.pathname);
      return false;
    }
    
    const phantomPubKey = params.get('phantom_encryption_public_key');
    const nonce = params.get('nonce');
    const data = params.get('data');
    
    if (!phantomPubKey || !nonce || !data) {
      // Clean URL
      window.history.replaceState({}, '', window.location.origin + window.location.pathname);
      setError('ERREUR: Paramètres manquants dans URL Phantom (phantom_encryption_public_key, nonce, ou data)');
      return false;
    }
    
    console.log('[Wallet] Params OK, checking for keypair...');
    
    // SOLUTION: Get keypair from URL hash fragment first (survives Phantom redirect)
    // Hash format: #kp=ENCODED_KEYPAIR
    let keypairJson: string | null = null;
    
    const hash = window.location.hash;
    if (hash && hash.includes('kp=')) {
      try {
        // Parse hash fragment (remove leading #)
        const hashParams = new URLSearchParams(hash.substring(1));
        const kpFromHash = hashParams.get('kp');
        if (kpFromHash) {
          keypairJson = decodeURIComponent(kpFromHash);
          console.log('[Wallet] Keypair found in URL hash fragment!');
        }
      } catch (e) {
        console.log('[Wallet] Failed to parse keypair from hash:', e);
      }
    }
    
    // Fallback: check query params (in case hash didn't work)
    if (!keypairJson) {
      const kpFromQuery = params.get('kp');
      if (kpFromQuery) {
        try {
          keypairJson = decodeURIComponent(kpFromQuery);
          console.log('[Wallet] Keypair found in URL query parameter!');
        } catch (e) {
          console.log('[Wallet] Failed to decode keypair from query');
        }
      }
    }
    
    // Fallback: check storage
    if (!keypairJson) {
      keypairJson = await getFromStorage(KEYPAIR_KEY);
      if (keypairJson) {
        console.log('[Wallet] Keypair found in storage');
      }
    }
    
    // Clean URL now (after extracting keypair)
    window.history.replaceState({}, '', window.location.origin + window.location.pathname);
    
    if (!keypairJson) {
      // Build detailed error with debug info
      let debugMsg = 'ERREUR CRITIQUE: Keypair introuvable!\n\n';
      debugMsg += `URL reçue: ${url.substring(0, 100)}...\n`;
      debugMsg += `Hash: ${hash || '(vide)'}\n\n`;
      debugMsg += 'État des storages:\n';
      
      if (typeof window !== 'undefined') {
        try {
          debugMsg += `• localStorage: ${localStorage.getItem(KEYPAIR_KEY) ? 'OUI' : 'NON'}\n`;
        } catch (e) { debugMsg += '• localStorage: ERREUR\n'; }
        
        try {
          debugMsg += `• sessionStorage: ${sessionStorage.getItem(KEYPAIR_KEY) ? 'OUI' : 'NON'}\n`;
        } catch (e) { debugMsg += '• sessionStorage: ERREUR\n'; }
        
        try {
          debugMsg += `• cookie: ${document.cookie.includes(KEYPAIR_KEY) ? 'OUI' : 'NON'}\n`;
        } catch (e) { debugMsg += '• cookie: ERREUR\n'; }
      }
      
      debugMsg += '\nLe navigateur a effacé les données pendant la redirection Phantom.';
      debugMsg += '\nEssayez dans le navigateur intégré Phantom.';
      
      setError(debugMsg);
      return false;
    }
    
    console.log('[Wallet] Keypair found, decrypting...');
    
    try {
      await ensureCrypto();
      
      const keypair = JSON.parse(keypairJson);
      if (!keypair.pub || !keypair.sec) {
        setError('ERREUR: Keypair corrompu (pub ou sec manquant)');
        return false;
      }
      
      const secretKey = new Uint8Array(keypair.sec);
      const phantomBytes = bs58.decode(phantomPubKey);
      const nonceBytes = bs58.decode(nonce);
      const dataBytes = bs58.decode(data);
      
      console.log('[Wallet] Decoding OK, computing shared secret...');
      
      const sharedSecret = nacl.box.before(phantomBytes, secretKey);
      const decrypted = nacl.box.open.after(dataBytes, nonceBytes, sharedSecret);
      
      if (!decrypted) {
        let errMsg = 'ERREUR DECRYPTION: Échec!\n\n';
        errMsg += 'Cause probable: Le keypair stocké ne correspond pas à celui envoyé à Phantom.\n';
        errMsg += 'Cela peut arriver si:\n';
        errMsg += '• Vous avez cliqué Connect plusieurs fois\n';
        errMsg += '• Les données ont été corrompues\n';
        errMsg += '• Le navigateur a modifié les données\n\n';
        errMsg += 'Solution: Fermez et réessayez UNE SEULE fois.';
        setError(errMsg);
        return false;
      }
      
      console.log('[Wallet] Decryption SUCCESS!');
      
      const payload = JSON.parse(Buffer.from(decrypted).toString('utf8'));
      
      if (!payload.public_key) {
        setError('ERREUR: Réponse Phantom invalide (pas de public_key)');
        return false;
      }
      
      // SUCCESS
      await clearFromStorage(KEYPAIR_KEY);
      setWalletConnected(payload.public_key);
      return true;
      
    } catch (err: any) {
      const errMsg = `ERREUR TECHNIQUE: ${err?.message || 'Inconnue'}\n\nStack: ${err?.stack?.substring(0, 300) || 'N/A'}`;
      console.error('[Wallet]', errMsg);
      setError(errMsg);
      return false;
    }
  }, [setWalletConnected]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      console.log('[Wallet] Initializing...');
      
      // Check saved address first
      const savedAddr = await getFromStorage(WALLET_KEY);
      if (savedAddr) {
        console.log('[Wallet] Found saved address:', savedAddr);
        setWalletConnected(savedAddr);
        return;
      }
      
      // Check for callback
      await processCallback();
    };
    
    init();
  }, [processCallback, setWalletConnected]);

  // Fetch balances
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

  // Connect
  const connectWallet = useCallback(async () => {
    console.log('[Wallet] Connect clicked');
    
    if (connected || connecting || connectCalled.current) {
      console.log('[Wallet] Already connected/connecting');
      if (connected) await refreshBalances();
      return;
    }
    
    const savedAddr = await getFromStorage(WALLET_KEY);
    if (savedAddr) {
      console.log('[Wallet] Found saved, using it');
      setWalletConnected(savedAddr);
      return;
    }
    
    connectCalled.current = true;
    setConnecting(true);
    setError(null);

    try {
      // Try extension
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
              setError('Connexion rejetée par utilisateur');
              setConnecting(false);
              connectCalled.current = false;
              return;
            }
          }
        }
      }

      // Deep link
      console.log('[Wallet] Using deep link with POPUP...');
      await ensureCrypto();
      
      const kp = nacl.box.keyPair();
      const keypairJson = JSON.stringify({
        pub: Array.from(kp.publicKey),
        sec: Array.from(kp.secretKey),
      });
      
      console.log('[Wallet] Saving keypair to storage...');
      await saveToStorage(KEYPAIR_KEY, keypairJson);
      
      const dappPubKey = bs58.encode(kp.publicKey);
      const baseUrl = Platform.OS === 'web' 
        ? window.location.origin + window.location.pathname
        : Linking.createURL('phantom-callback');
      
      // Use base URL as redirect - the popup will redirect there
      const redirectUrl = baseUrl;
      
      console.log('[Wallet] Redirect URL:', redirectUrl);
      
      const params = new URLSearchParams({
        dapp_encryption_public_key: dappPubKey,
        cluster: 'mainnet-beta',
        app_url: baseUrl,
        redirect_link: redirectUrl,
      });
      
      const phantomUrl = `https://phantom.app/ul/v1/connect?${params.toString()}`;
      console.log('[Wallet] Opening Phantom in POPUP...');
      
      if (Platform.OS === 'web') {
        // POPUP APPROACH: Open in popup window, main page stays open with storage intact
        const width = 420;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        const popup = window.open(
          phantomUrl,
          'phantom_connect',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
        
        if (!popup) {
          // Popup blocked - fall back to redirect
          console.log('[Wallet] Popup blocked, using redirect...');
          setError('POPUP BLOQUÉ: Autorisez les popups pour ce site et réessayez, ou utilisez la redirection ci-dessous.');
          
          // Store a flag to use redirect next time
          setTimeout(() => {
            window.location.href = phantomUrl;
          }, 3000);
          return;
        }
        
        console.log('[Wallet] Popup opened, waiting for callback...');
        
        // Poll the popup to check when it redirects back
        const pollInterval = setInterval(() => {
          try {
            if (popup.closed) {
              console.log('[Wallet] Popup was closed');
              clearInterval(pollInterval);
              setConnecting(false);
              connectCalled.current = false;
              return;
            }
            
            // Check if popup redirected to our URL
            const popupUrl = popup.location.href;
            if (popupUrl && popupUrl.startsWith(baseUrl)) {
              console.log('[Wallet] Popup redirected back!', popupUrl);
              clearInterval(pollInterval);
              
              // Extract params from popup URL
              const popupParams = new URL(popupUrl).searchParams;
              const phantomPubKey = popupParams.get('phantom_encryption_public_key');
              const nonce = popupParams.get('nonce');
              const data = popupParams.get('data');
              const errorCode = popupParams.get('errorCode');
              
              // Close popup
              popup.close();
              
              if (errorCode) {
                const errMsg = popupParams.get('errorMessage') || 'Cancelled';
                setError(`PHANTOM ERREUR (${errorCode}): ${errMsg}`);
                setConnecting(false);
                connectCalled.current = false;
                return;
              }
              
              if (phantomPubKey && nonce && data) {
                // Process the callback with the data
                processPhantomResponse(phantomPubKey, nonce, data);
              } else {
                setError('ERREUR: Réponse Phantom incomplète');
                setConnecting(false);
                connectCalled.current = false;
              }
            }
          } catch (e) {
            // Cross-origin error - popup is on phantom.app, can't read URL yet
            // This is expected, keep polling
          }
        }, 500);
        
        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          if (!popup.closed) {
            popup.close();
          }
          if (connecting) {
            setError('TIMEOUT: La connexion a pris trop de temps');
            setConnecting(false);
            connectCalled.current = false;
          }
        }, 300000);
        
      } else {
        const result = await WebBrowser.openAuthSessionAsync(phantomUrl, redirectUrl);
        if (result.type === 'success' && result.url) {
          // Process on native
          const nativeParams = new URLSearchParams(new URL(result.url).search);
          // Similar processing...
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

  // Disconnect
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
    
    await clearFromStorage(WALLET_KEY);
    await clearFromStorage(KEYPAIR_KEY);
    
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
