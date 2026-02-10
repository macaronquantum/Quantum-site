import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';

interface WalletContextType {
  connected: boolean;
  address: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  publicKey: any;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

function generateWalletAddress(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
  let address = '';
  for (let i = 0; i < 44; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return address;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<any>(null);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const storedAddress = await AsyncStorage.getItem('walletAddress');
      if (storedAddress) {
        setConnected(true);
        setAddress(storedAddress);
        setPublicKey({ toBase58: () => storedAddress });
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    }
  };

  const connectWallet = async () => {
    try {
      const walletAddress = generateWalletAddress();
      setConnected(true);
      setAddress(walletAddress);
      setPublicKey({ toBase58: () => walletAddress });
      await AsyncStorage.setItem('walletAddress', walletAddress);
      console.log('Wallet connected:', walletAddress);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = async () => {
    try {
      setConnected(false);
      setAddress(null);
      setPublicKey(null);
      await AsyncStorage.removeItem('walletAddress');
      console.log('Wallet disconnected');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  return (
    <WalletContext.Provider value={{ connected, address, connectWallet, disconnectWallet, publicKey }}>
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
