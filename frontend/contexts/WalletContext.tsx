import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Buffer } from 'buffer';

// ─── Types ──────────────────────────────────────────────
interface WalletContextType {
  connected: boolean;
  address: string | null;
  connecting: boolean;
  votingPower: number;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  connected: false,
  address: null,
  connecting: false,
  votingPower: 0,
  connectWallet: async () => {},
  disconnectWallet: async () => {},
});

// ─── Phantom browser extension helper (web only) ──────
const getPhantomProvider = (): any | null => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const w = window as any;
    if (w.phantom?.solana?.isPhantom) return w.phantom.solana;
    if (w.solana?.isPhantom) return w.solana;
  }
  return null;
};

// ─── Deep-link prefix ─────────────────────────────────
const buildRedirectUri = (path: string) => Linking.createURL(path);

// ─── Provider ─────────────────────────────────────────
export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [session, setSession] = useState<string | null>(null);

  // Persistent keypair for Phantom deep-link handshake
  const dappKeyPair = useRef(nacl.box.keyPair());
  const sharedSecretRef = useRef<Uint8Array | null>(null);

  // Demo balances
  const quantumBalance = connected ? 3500 : 0;
  const coQuantumBalance = connected ? 250 : 0;
  const votingPower = quantumBalance + coQuantumBalance * 2;

  // ── Restore session on mount ──────────────────────
  useEffect(() => {
    restoreSession();
  }, []);

  // ── Listen for Phantom deep-link callbacks ────────
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      handleDeepLink(event.url);
    };

    const sub = Linking.addEventListener('url', handleUrl);

    // Also check the initial URL (app opened from deep-link)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    return () => sub.remove();
  }, []);

  // ── Deep-link response handler ────────────────────
  const handleDeepLink = async (url: string) => {
    try {
      if (!url) return;

      // Parse the URL
      const parsedUrl = new URL(url);
      const params = parsedUrl.searchParams;

      // Check if this is a Phantom connect response
      if (
        url.includes('onConnect') ||
        url.includes('phantom-connect') ||
        params.has('phantom_encryption_public_key')
      ) {
        // Check for error
        const errorCode = params.get('errorCode');
        if (errorCode) {
          const errorMsg = params.get('errorMessage') || 'Connection rejected';
          Alert.alert('Connection Failed', errorMsg);
          setConnecting(false);
          return;
        }

        const phantomPubKeyStr = params.get('phantom_encryption_public_key');
        const nonceStr = params.get('nonce');
        const dataStr = params.get('data');

        if (!phantomPubKeyStr || !nonceStr || !dataStr) {
          console.warn('Missing deep-link params');
          setConnecting(false);
          return;
        }

        // Decode base58 values
        const phantomPubKey = bs58.decode(phantomPubKeyStr);
        const nonce = bs58.decode(nonceStr);
        const encryptedData = bs58.decode(dataStr);

        // Derive shared secret
        const sharedSecret = nacl.box.before(
          phantomPubKey,
          dappKeyPair.current.secretKey
        );
        sharedSecretRef.current = sharedSecret;

        // Decrypt
        const decrypted = nacl.box.open.after(encryptedData, nonce, sharedSecret);

        if (!decrypted) {
          Alert.alert('Error', 'Failed to decrypt wallet response.');
          setConnecting(false);
          return;
        }

        const decoded = JSON.parse(
          Buffer.from(decrypted).toString('utf8')
        );

        const walletAddress = decoded.public_key;
        const phantomSession = decoded.session;

        // Save state
        setConnected(true);
        setAddress(walletAddress);
        setSession(phantomSession);
        setConnecting(false);

        await AsyncStorage.setItem('walletAddress', walletAddress);
        await AsyncStorage.setItem('phantomSession', phantomSession);

        Alert.alert(
          'Wallet Connected',
          `Address: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}`
        );
      }

      // Disconnect response
      if (url.includes('onDisconnect')) {
        await clearSession();
      }
    } catch (error: any) {
      console.error('Deep-link handler error:', error);
      setConnecting(false);
    }
  };

  // ── Restore previous session ──────────────────────
  const restoreSession = async () => {
    try {
      const storedAddress = await AsyncStorage.getItem('walletAddress');
      if (storedAddress) {
        // On web, try to reconnect via extension silently
        if (Platform.OS === 'web') {
          const provider = getPhantomProvider();
          if (provider) {
            try {
              const resp = await provider.connect({ onlyIfTrusted: true });
              const addr = resp.publicKey.toString();
              setConnected(true);
              setAddress(addr);
              await AsyncStorage.setItem('walletAddress', addr);
              return;
            } catch {
              // Silent reconnect failed – that's ok
            }
          }
        }
        // Fallback: restore from stored address
        setConnected(true);
        setAddress(storedAddress);
      }
    } catch (err) {
      console.error('Restore session error:', err);
    }
  };

  // ── Connect ───────────────────────────────────────
  const connectWallet = async () => {
    if (connecting) return;
    setConnecting(true);

    try {
      // ── WEB: use browser extension ──
      if (Platform.OS === 'web') {
        const provider = getPhantomProvider();
        if (provider) {
          const resp = await provider.connect();
          const addr = resp.publicKey.toString();
          setConnected(true);
          setAddress(addr);
          setConnecting(false);
          await AsyncStorage.setItem('walletAddress', addr);
          return;
        }
        // No extension → open Phantom website
        Alert.alert(
          'Phantom Required',
          'Install the Phantom extension to connect your wallet.',
          [
            {
              text: 'Get Phantom',
              onPress: () => {
                if (typeof window !== 'undefined')
                  window.open('https://phantom.app/', '_blank');
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        setConnecting(false);
        return;
      }

      // ── MOBILE: Phantom deep-link ──
      const redirectUri = buildRedirectUri('onConnect');

      const params = new URLSearchParams({
        dapp_encryption_public_key: bs58.encode(
          Buffer.from(dappKeyPair.current.publicKey)
        ),
        cluster: 'mainnet-beta',
        app_url: 'https://quantum-ia.com',
        redirect_link: redirectUri,
      });

      const connectUrl = `https://phantom.app/ul/v1/connect?${params.toString()}`;

      const canOpen = await Linking.canOpenURL('phantom://');
      if (canOpen) {
        await Linking.openURL(connectUrl);
      } else {
        Alert.alert(
          'Phantom Not Found',
          'Please install the Phantom wallet app.',
          [
            {
              text: 'Install',
              onPress: () =>
                Linking.openURL(
                  Platform.OS === 'ios'
                    ? 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977'
                    : 'https://play.google.com/store/apps/details?id=app.phantom'
                ),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        setConnecting(false);
      }
    } catch (error: any) {
      console.error('Connect error:', error);
      Alert.alert('Connection Error', error?.message || 'Failed to connect.');
      setConnecting(false);
    }
  };

  // ── Disconnect ────────────────────────────────────
  const disconnectWallet = async () => {
    try {
      // Web: disconnect via extension
      if (Platform.OS === 'web') {
        const provider = getPhantomProvider();
        if (provider) {
          try {
            await provider.disconnect();
          } catch {
            // ignore
          }
        }
      } else if (session && sharedSecretRef.current) {
        // Mobile: deep-link disconnect
        try {
          const nonce = nacl.randomBytes(24);
          const payload = JSON.stringify({ session });
          const encrypted = nacl.box.after(
            Buffer.from(payload),
            nonce,
            sharedSecretRef.current
          );

          const redirectUri = buildRedirectUri('onDisconnect');
          const params = new URLSearchParams({
            dapp_encryption_public_key: bs58.encode(
              Buffer.from(dappKeyPair.current.publicKey)
            ),
            nonce: bs58.encode(Buffer.from(nonce)),
            redirect_link: redirectUri,
            payload: bs58.encode(Buffer.from(encrypted)),
          });

          await Linking.openURL(
            `https://phantom.app/ul/v1/disconnect?${params.toString()}`
          );
        } catch {
          // If deep-link disconnect fails, just clear locally
        }
      }

      await clearSession();
    } catch (error) {
      console.error('Disconnect error:', error);
      await clearSession();
    }
  };

  const clearSession = async () => {
    setConnected(false);
    setAddress(null);
    setSession(null);
    sharedSecretRef.current = null;
    await AsyncStorage.multiRemove(['walletAddress', 'phantomSession']);
  };

  return (
    <WalletContext.Provider
      value={{
        connected,
        address,
        connecting,
        votingPower,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
