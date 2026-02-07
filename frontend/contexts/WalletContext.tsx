import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Keypair } from '@solana/web3.js';

interface WalletContextType {
  connected: boolean;
  address: string | null;
  quantumBalance: number;
  coQuantumBalance: number;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  votingPower: number;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [quantumBalance, setQuantumBalance] = useState(0);
  const [coQuantumBalance, setCoQuantumBalance] = useState(0);

  // Calculate voting power: 1 Quantum = 1 vote, 1 Co-Quantum = 2 votes
  const votingPower = quantumBalance + (coQuantumBalance * 2);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const storedAddress = await AsyncStorage.getItem('walletAddress');
      const storedQuantum = await AsyncStorage.getItem('quantumBalance');
      const storedCoQuantum = await AsyncStorage.getItem('coQuantumBalance');

      if (storedAddress) {
        setConnected(true);
        setAddress(storedAddress);
        setQuantumBalance(parseFloat(storedQuantum || '0'));
        setCoQuantumBalance(parseFloat(storedCoQuantum || '0'));
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

      // Generate mock balances for demo
      const mockQuantum = Math.floor(Math.random() * 5000) + 1000; // 1000-6000
      const mockCoQuantum = Math.floor(Math.random() * 500) + 100; // 100-600

      setConnected(true);
      setAddress(walletAddress);
      setQuantumBalance(mockQuantum);
      setCoQuantumBalance(mockCoQuantum);

      // Save to AsyncStorage
      await AsyncStorage.setItem('walletAddress', walletAddress);
      await AsyncStorage.setItem('quantumBalance', mockQuantum.toString());
      await AsyncStorage.setItem('coQuantumBalance', mockCoQuantum.toString());
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = async () => {
    try {
      setConnected(false);
      setAddress(null);
      setQuantumBalance(0);
      setCoQuantumBalance(0);

      await AsyncStorage.removeItem('walletAddress');
      await AsyncStorage.removeItem('quantumBalance');
      await AsyncStorage.removeItem('coQuantumBalance');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        connected,
        address,
        quantumBalance,
        coQuantumBalance,
        connectWallet,
        disconnectWallet,
        votingPower,
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
