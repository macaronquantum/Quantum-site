import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Keypair } from '@solana/web3.js';

interface WalletContextType {
  connected: boolean;
  address: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  publicKey: any;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

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
      console.error('Error loading wallet data:', error);
    }
  };

  const connectWallet = async () => {
    try {
      // Generate a demo Solana wallet address
      const keypair = Keypair.generate();
      const walletAddress = keypair.publicKey.toString();

      setConnected(true);
      setAddress(walletAddress);
      setPublicKey(keypair.publicKey);

      // Save to AsyncStorage
      await AsyncStorage.setItem('walletAddress', walletAddress);
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
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        connected,
        address,
        connectWallet,
        disconnectWallet,
        publicKey,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
