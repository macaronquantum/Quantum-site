import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Use mainnet for production
const network = clusterApiUrl('mainnet-beta');

interface WalletContextType {
  connected: boolean;
  address: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  publicKey: any;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProviderWrapper({ children }: { children: ReactNode }) {
  // Configure wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={network}>
      <SolanaWalletProvider wallets={wallets} autoConnect={false}>
        <WalletProviderInner>{children}</WalletProviderInner>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}

function WalletProviderInner({ children }: { children: ReactNode }) {
  const { publicKey, connected, connect, disconnect } = useSolanaWallet();

  const connectWallet = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  const contextValue: WalletContextType = {
    connected,
    address: publicKey?.toBase58() || null,
    connectWallet,
    disconnectWallet,
    publicKey,
  };

  return (
    <WalletContext.Provider value={contextValue}>
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

// For compatibility, export WalletProvider as alias
export const WalletProvider = WalletProviderWrapper;
