import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getSolanaBalance } from '../utils/api';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Buffer } from 'buffer';

const WALLET_KEY = 'quantum_wallet';
const QUANTUM_PRICE_USD = 0.20;
const API_URL = import.meta.env.VITE_BACKEND_URL || '';

function saveWallet(address) {
  try { localStorage.setItem(WALLET_KEY, address); } catch (e) {}
}
function getWallet() {
  try { return localStorage.getItem(WALLET_KEY); } catch (e) { return null; }
}
function clearWalletStorage() {
  try { localStorage.removeItem(WALLET_KEY); } catch (e) {}
}

function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function getPhantomProvider() {
  if (typeof window === 'undefined') return null;
  const provider = window.phantom?.solana || window.solana;
  if (provider?.isPhantom) return provider;
  return null;
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

  const clearError = useCallback(() => setError(null), []);

  const setWalletConnected = useCallback((addr) => {
    saveWallet(addr);
    setAddress(addr);
    setConnected(true);
    setConnecting(false);
  }, []);

  const setConnectedAddress = useCallback((addr) => {
    saveWallet(addr);
    setAddress(addr);
    setConnected(true);
    setConnecting(false);
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

  const connectViaExtension = useCallback(async () => {
    const provider = getPhantomProvider();
    if (!provider) return false;
    const resp = await provider.connect();
    setWalletConnected(resp.publicKey.toString());
    return true;
  }, [setWalletConnected]);

  const connectViaDeepLink = useCallback(async () => {
    const kp = nacl.box.keyPair();
    const dappPubKey = bs58.encode(kp.publicKey);
    const keypairJson = JSON.stringify({
      pub: Array.from(kp.publicKey),
      sec: Array.from(kp.secretKey),
    });

    const response = await fetch(`${API_URL}/api/wallet/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keypair: keypairJson }),
    });

    if (!response.ok) throw new Error('Erreur serveur: impossible de creer la session');

    const { session_id } = await response.json();
    const baseUrl = window.location.origin;
    const redirectUrl = `${baseUrl}/connect/${session_id}`;

    const phantomParams = new URLSearchParams({
      dapp_encryption_public_key: dappPubKey,
      cluster: 'mainnet-beta',
      app_url: baseUrl,
      redirect_link: redirectUrl,
    });

    window.location.href = `https://phantom.app/ul/v1/connect?${phantomParams.toString()}`;
  }, []);

  const connectWallet = useCallback(async () => {
    if (connected) { await refreshBalances(); return; }
    if (connecting) return;

    const saved = getWallet();
    if (saved) { setWalletConnected(saved); return; }

    setConnecting(true);
    setError(null);

    try {
      const mobile = isMobileDevice();

      if (mobile) {
        await connectViaDeepLink();
        return;
      }

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
  }, [connected, connecting, refreshBalances, setWalletConnected, connectViaDeepLink]);

  const connectWalletDeepLink = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      await connectViaDeepLink();
    } catch (err) {
      setError(err?.message || 'Erreur de connexion');
      setConnecting(false);
    }
  }, [connectViaDeepLink]);

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
  }, []);

  const votingPower = quantumBalance ? Math.floor(quantumBalance.amount) : 0;

  return (
    <WalletContext.Provider value={{
      connected, address, connecting, quantumBalance, solBalance,
      usdValue, eurValue, eurRate, loadingBalances, votingPower,
      error, clearError, connectWallet, connectWalletDeepLink,
      disconnectWallet, refreshBalances, setConnectedAddress, isMobile: isMobileDevice,
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
