import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Platform, Alert } from 'react-native';
import 'react-native-get-random-values';

interface WalletContextType {
  connected: boolean;
  address: string | null;
  publicKey: any;
  votingPower: number;
  connecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Get Phantom provider (web only)
const getPhantomProvider = (): any => {
  if (typeof window !== 'undefined') {
    const w = window as any;
    if (w.phantom?.solana?.isPhantom) {
      return w.phantom.solana;
    }
    if (w.solana?.isPhantom) {
      return w.solana;
    }
  }
  return null;
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<any>(null);
  const [connecting, setConnecting] = useState(false);

  // Voting power calculation (demo balances)
  const quantumBalance = connected ? 3500 : 0;
  const coQuantumBalance = connected ? 250 : 0;
  const votingPower = quantumBalance + coQuantumBalance * 2;

  useEffect(() => {
    restoreSession();
    setupPhantomListeners();
  }, []);

  const setupPhantomListeners = () => {
    if (Platform.OS === 'web') {
      const provider = getPhantomProvider();
      if (provider) {
        provider.on?.('connect', (pk: any) => {
          const addr = pk.toString();
          setConnected(true);
          setAddress(addr);
          setPublicKey(pk);
          AsyncStorage.setItem('walletAddress', addr);
        });
        provider.on?.('disconnect', () => {
          setConnected(false);
          setAddress(null);
          setPublicKey(null);
          AsyncStorage.removeItem('walletAddress');
        });
        provider.on?.('accountChanged', (pk: any) => {
          if (pk) {
            const addr = pk.toString();
            setAddress(addr);
            setPublicKey(pk);
            AsyncStorage.setItem('walletAddress', addr);
          } else {
            setConnected(false);
            setAddress(null);
            setPublicKey(null);
            AsyncStorage.removeItem('walletAddress');
          }
        });
      }
    }
  };

  const restoreSession = async () => {
    try {
      const storedAddress = await AsyncStorage.getItem('walletAddress');
      if (storedAddress) {
        if (Platform.OS === 'web') {
          const provider = getPhantomProvider();
          if (provider) {
            try {
              const resp = await provider.connect({ onlyIfTrusted: true });
              const addr = resp.publicKey.toString();
              setConnected(true);
              setAddress(addr);
              setPublicKey(resp.publicKey);
              await AsyncStorage.setItem('walletAddress', addr);
              return;
            } catch {
              // Silent reconnect failed
            }
          }
        }
        // Restore from storage as fallback
        setConnected(true);
        setAddress(storedAddress);
        setPublicKey({ toBase58: () => storedAddress, toString: () => storedAddress });
      }
    } catch (error) {
      console.error('Error restoring wallet session:', error);
    }
  };

  const connectWallet = async () => {
    if (connecting) return;
    setConnecting(true);

    try {
      if (Platform.OS === 'web') {
        const provider = getPhantomProvider();
        if (provider) {
          const resp = await provider.connect();
          const addr = resp.publicKey.toString();
          setConnected(true);
          setAddress(addr);
          setPublicKey(resp.publicKey);
          await AsyncStorage.setItem('walletAddress', addr);
          return;
        } else {
          // Phantom not installed
          Alert.alert(
            'Phantom Wallet Required',
            'Install Phantom browser extension to connect your Solana wallet.',
            [
              {
                text: 'Install Phantom',
                onPress: () => {
                  if (typeof window !== 'undefined') {
                    window.open('https://phantom.app/', '_blank');
                  }
                },
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        }
      } else {
        // Mobile: Deep-link to Phantom
        const phantomScheme = 'phantom://';
        const canOpen = await Linking.canOpenURL(phantomScheme);

        if (canOpen) {
          const redirectUrl = Linking.createURL('onConnect');
          const connectUrl = `https://phantom.app/ul/v1/connect?app_url=${encodeURIComponent(
            'https://quantum-ia.com'
          )}&redirect_link=${encodeURIComponent(redirectUrl)}&cluster=mainnet-beta`;
          await Linking.openURL(connectUrl);
        } else {
          Alert.alert(
            'Phantom Wallet Required',
            'Install the Phantom app to connect your Solana wallet.',
            [
              {
                text: 'Install',
                onPress: () => Linking.openURL('https://phantom.app/'),
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        }
      }
    } catch (error: any) {
      console.error('Connect error:', error);
      if (error?.code === 4001) {
        Alert.alert('Rejected', 'Connection request was rejected.');
      } else {
        Alert.alert('Error', 'Failed to connect wallet. Please try again.');
      }
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      if (Platform.OS === 'web') {
        const provider = getPhantomProvider();
        if (provider) {
          try {
            await provider.disconnect();
          } catch {
            // Provider might not support disconnect
          }
        }
      }
      setConnected(false);
      setAddress(null);
      setPublicKey(null);
      await AsyncStorage.removeItem('walletAddress');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        connected,
        address,
        publicKey,
        votingPower,
        connecting,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}
