import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWallet, QUANTUM_PRICE_USD } from '../contexts/WalletContext';
import { Wallet, Copy, Check, ExternalLink, RefreshCw, Zap, ArrowRight, Download } from 'lucide-react';

const QUANTUM_MINT = '4KsZXRH3Xjd7z4CiuwgfNQstC2aHDLdJHv5u3tDixtLc';
const SOLSCAN_URL = `https://solscan.io/token/${QUANTUM_MINT}`;

export default function Portfolio() {
  const {
    connected, address, connecting, connectWallet, disconnectWallet,
    quantumBalance, solBalance, usdValue, eurValue, eurRate,
    loadingBalances, refreshBalances, error, clearError,
  } = useWallet();

  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshBalances();
    setRefreshing(false);
  }, [refreshBalances]);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddr = (a) => `${a.slice(0, 4)}...${a.slice(-4)}`;
  const formatNum = (n, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const hasTokens = quantumBalance && quantumBalance.amount > 0;

  if (!connected) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center" data-testid="portfolio-disconnected">
        {/* CTA Banner */}
        <Link to="/presale" className="block mb-10" data-testid="cta-presale-banner">
          <div className="bg-gradient-to-r from-[#6B21A8] via-[#7C3AED] to-[#8B5CF6] rounded-2xl p-6 text-left shadow-[0_4px_20px_rgba(139,92,246,0.3)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1 bg-black/30 px-2 py-1 rounded text-[10px] font-bold text-yellow-300 mb-2">
                  <Zap size={10} /> OFFRE LIMITEE
                </div>
                <p className="text-white font-bold text-lg">Acheter des Quantum</p>
                <p className="text-white/70 text-xs">50% du prix de listing - Listing 1er Juin 2026</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0">
                <ArrowRight size={18} className="text-primary" />
              </div>
            </div>
          </div>
        </Link>

        <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center mx-auto mb-6">
          <Wallet size={36} className="text-text-tertiary" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Connecter Wallet</h2>
        <p className="text-sm text-text-secondary mb-8">
          Connectez votre wallet Solana pour voir votre solde Quantum en temps reel
        </p>
        <button
          onClick={() => { clearError(); connectWallet(); }}
          disabled={connecting}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold transition-all disabled:opacity-50 shadow-[0_0_24px_rgba(139,92,246,0.35)]"
          data-testid="connect-wallet-portfolio"
        >
          <Wallet size={18} />
          {connecting ? 'Connexion...' : 'Connecter Phantom'}
        </button>
        {error === 'NO_WALLET' && (
          <div className="mt-6 bg-surface border border-warning/30 rounded-xl p-4 text-left max-w-sm mx-auto">
            <p className="text-sm font-semibold text-text-primary mb-1">Aucun wallet Solana detecte</p>
            <p className="text-xs text-text-secondary mb-3">Installez l'extension Phantom pour continuer.</p>
            <a href="https://phantom.app/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary font-medium">
              <Download size={14} /> Installer Phantom
            </a>
          </div>
        )}
        {error && error !== 'NO_WALLET' && (
          <div className="mt-6 bg-surface border border-error/30 rounded-xl p-4 max-w-sm mx-auto">
            <p className="text-sm text-error font-mono">{error}</p>
            <button onClick={clearError} className="mt-2 text-xs text-error underline">Fermer</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="portfolio-connected">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Portfolio</h1>
        <div className="flex items-center gap-2">
          <button onClick={copyAddress} className="flex items-center gap-1.5 text-xs text-text-secondary font-mono bg-surface border border-border rounded-lg px-3 py-1.5 hover:border-border-light transition-colors" data-testid="copy-wallet">
            <span className="w-2 h-2 rounded-full bg-success" />
            {formatAddr(address)}
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
          </button>
          <button onClick={onRefresh} disabled={refreshing} className="p-2 rounded-lg bg-surface border border-border hover:border-border-light transition-colors disabled:opacity-50" data-testid="refresh-btn">
            <RefreshCw size={16} className={`text-text-secondary ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* CTA Banner */}
      <Link to="/presale" className="block mb-6" data-testid="cta-presale-banner">
        <div className="bg-gradient-to-r from-[#6B21A8] via-[#7C3AED] to-[#8B5CF6] rounded-2xl p-5 shadow-[0_4px_16px_rgba(139,92,246,0.3)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1 bg-black/30 px-2 py-1 rounded text-[10px] font-bold text-yellow-300 mb-2">
                <Zap size={10} /> OFFRE LIMITEE
              </div>
              <p className="text-white font-bold">Acheter des Quantum</p>
              <p className="text-white/70 text-xs">50% du prix de listing - Listing 1er Juin 2026</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 ml-4">
              <ArrowRight size={18} className="text-primary" />
            </div>
          </div>
        </div>
      </Link>

      {/* Total Value */}
      <div className="bg-surface border border-border rounded-2xl p-6 mb-6" data-testid="total-value-card">
        {loadingBalances ? (
          <div className="flex justify-center py-8"><RefreshCw size={24} className="text-primary animate-spin" /></div>
        ) : (
          <>
            <p className="text-xs text-text-secondary mb-1">Total Quantum Value</p>
            <p className="text-3xl font-extrabold text-text-primary">${formatNum(usdValue)}</p>
            <p className="text-sm text-text-secondary mt-1">
              ≈ €{formatNum(eurValue)} EUR <span className="text-xs text-text-tertiary">(1 USD = {eurRate.toFixed(4)} EUR)</span>
            </p>
            <div className="mt-4 inline-flex items-center bg-surface-elevated border border-primary/30 rounded-md px-2 py-1 text-xs text-primary font-semibold">
              1 QTM = ${QUANTUM_PRICE_USD.toFixed(2)}
            </div>
          </>
        )}
      </div>

      {/* Holdings */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Holdings</h2>
        <div className="bg-surface border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm">Q</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">Quantum</p>
              <p className="text-xs text-text-tertiary">QTM</p>
            </div>
            <div className="text-right">
              {loadingBalances ? (
                <RefreshCw size={16} className="text-primary animate-spin" />
              ) : (
                <>
                  <p className="text-sm font-bold text-text-primary">{hasTokens ? formatNum(quantumBalance.amount, 4) : '0'}</p>
                  <p className="text-xs text-text-secondary">${formatNum(usdValue)}</p>
                </>
              )}
            </div>
          </div>
        </div>
        {!hasTokens && !loadingBalances && (
          <div className="mt-2 flex items-center gap-2 bg-surface border border-warning/20 rounded-xl p-3 text-sm text-warning">
            <Info size={16} className="shrink-0" />
            Aucun token Quantum detecte dans ce wallet.
          </div>
        )}
        <a href={SOLSCAN_URL} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 mt-2 text-xs text-text-tertiary hover:text-text-secondary transition-colors" data-testid="solscan-link">
          <ExternalLink size={12} /> Voir sur Solscan
        </a>
      </div>

      {/* SOL Balance */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Network</h2>
        <div className="bg-surface border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1a1a2e] flex items-center justify-center text-[#14F195] font-bold text-lg">◎</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary">Solana</p>
              <p className="text-xs text-text-tertiary">SOL</p>
            </div>
            <p className="text-sm font-bold text-text-primary">{loadingBalances ? '...' : formatNum(solBalance, 4)}</p>
          </div>
        </div>
      </div>

      {/* On-Chain Info */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-3">On-Chain</h2>
        <div className="bg-surface border border-border rounded-2xl divide-y divide-divider">
          <InfoRow label="Network" value="Solana Mainnet" />
          <InfoRow label="Token Mint" value="4KsZ...ixtLc" copyValue={QUANTUM_MINT} />
          <InfoRow label="Prix" value="Fixed $0.20 (Pre-TGE)" />
        </div>
      </div>
    </div>
  );
}

function Info({ size, className }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
}

function InfoRow({ label, value, copyValue }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!copyValue) return;
    navigator.clipboard.writeText(copyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${copyValue ? 'cursor-pointer hover:bg-surface-hover transition-colors' : ''}`}
      onClick={handleCopy}
    >
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-text-primary">{value}</span>
        {copyValue && (copied ? <Check size={12} className="text-success" /> : <Copy size={12} className="text-text-tertiary" />)}
      </div>
    </div>
  );
}
