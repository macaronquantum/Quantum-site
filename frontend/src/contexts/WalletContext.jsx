import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getSolanaBalance } from '../utils/api';

const WALLET_KEY = 'quantum_wallet';
const QUANTUM_PRICE_USD = 0.20;

function saveWallet(address) {
  try { localStorage.setItem(WALLET_KEY, address); } catch (e) {}
}
function getWallet() {
  try { return localStorage.getItem(WALLET_KEY); } catch (e) { return null; }
}
function clearWalletStorage() {
  try { localStorage.removeItem(WALLET_KEY); } catch (e) {}
}

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [quantumBalance, setQuantumBalance] = useState(null);
  const [solBalance, setSolBalance] = useState(0);
  const [usdValue, setUsdValue] = useState(0);
  const [eurValue, setEurValue] = useState(0);
  const [eurRate, setEurRate] = useState(0.92);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const connectCalled = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  const setWalletConnected = useCallback((addr) => {
    saveWallet(addr);
    setAddress(addr);
    setConnected(true);
    setConnecting(false);
    connectCalled.current = false;
  }, []);

  useEffect(() => {
    const saved = getWallet();
    if (saved) setWalletConnected(saved);
  }, [setWalletConnected]);

  const refreshBalances = useCallback(async () => {
    if (!address) return;
    setLoadingBalances(true);
    try {
      const res = await getSolanaBalance(address);
      const data = res.data;
      const qtm = {
        amount: data.quantum?.amount || 0,
        rawAmount: data.quantum?.rawAmount || '0',
        decimals: data.quantum?.decimals || 0,
        uiAmountString: data.quantum?.uiAmountString || '0',
      };
      const sol = data.sol_balance || 0;
      let rate = 0.92;
      try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=eur');
        const j = await r.json();
        rate = j?.usd?.eur || 0.92;
      } catch (e) {}
      setQuantumBalance(qtm);
      setSolBalance(sol);
      setEurRate(rate);
      setUsdValue(qtm.amount * QUANTUM_PRICE_USD);
      setEurValue(qtm.amount * QUANTUM_PRICE_USD * rate);
    } catch (err) {
      console.error('[Wallet] Balance error:', err?.message);
    } finally {
      setLoadingBalances(false);
    }
  }, [address]);

  useEffect(() => {
    if (connected && address) refreshBalances();
    else { setQuantumBalance(null); setSolBalance(0); setUsdValue(0); setEurValue(0); }
  }, [connected, address, refreshBalances]);

  const getPhantomProvider = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const provider = window.phantom?.solana || window.solana;
    if (provider?.isPhantom) return provider;
    return null;
  }, []);

  const connectWallet = useCallback(async () => {
    if (connected) { await refreshBalances(); return; }
    if (connecting) return;

    const saved = getWallet();
    if (saved) { setWalletConnected(saved); return; }

    setConnecting(true);
    setError(null);

    try {
      const provider = getPhantomProvider();
      if (provider) {
        const resp = await provider.connect();
        setWalletConnected(resp.publicKey.toString());
        return;
      }
      setError('NO_WALLET');
      setConnecting(false);
    } catch (err) {
      if (err?.code === 4001) {
        setError('Connexion rejetee par utilisateur');
      } else {
        setError(err?.message || 'Erreur de connexion');
      }
      setConnecting(false);
    }
  }, [connected, connecting, refreshBalances, setWalletConnected, getPhantomProvider]);

  const disconnectWallet = useCallback(async () => {
    try {
      const provider = getPhantomProvider();
      if (provider?.disconnect) await provider.disconnect();
    } catch (e) {}
    setConnected(false);
    setAddress(null);
    setQuantumBalance(null);
    setSolBalance(0);
    setUsdValue(0);
    setEurValue(0);
    setError(null);
    clearWalletStorage();
  }, [getPhantomProvider]);

  const votingPower = quantumBalance ? Math.floor(quantumBalance.amount) : 0;

  return (
    <WalletContext.Provider value={{
      connected, address, connecting, quantumBalance, solBalance,
      usdValue, eurValue, eurRate, loadingBalances, votingPower,
      error, clearError, connectWallet, disconnectWallet, refreshBalances,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

export { QUANTUM_PRICE_USD };
