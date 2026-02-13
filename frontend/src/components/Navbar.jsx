import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { Menu, X, Wallet, ChevronDown, LogOut, Copy, Check, Download, AlertCircle, ExternalLink, Smartphone } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Accueil' },
  { path: '/presale', label: 'Presale' },
  { path: '/portfolio', label: 'Portfolio' },
  { path: '/affiliation', label: 'Affiliations' },
  { path: '/opportunities', label: 'Opportunites' },
  { path: '/profile', label: 'Profil' },
];

export default function Navbar() {
  const { connected, address, connecting, connectWallet, connectWalletDeepLink, disconnectWallet, error, clearError, isMobile } = useWallet();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletDropdown, setWalletDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const location = useLocation();

  const formatAddr = (a) => `${a.slice(0, 4)}...${a.slice(-4)}`;

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = async () => {
    clearError();
    await connectWallet();
  };

  const handleDeepLinkConnect = async () => {
    clearError();
    await connectWalletDeepLink();
  };

  const walletError = error === 'NO_WALLET';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 shrink-0" data-testid="nav-logo">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <span className="text-text-primary font-bold text-lg hidden sm:block">Quantum IA</span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  location.pathname === item.path
                    ? 'text-primary bg-primary/10'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {connected && address ? (
              <div className="relative">
                <button
                  onClick={() => setWalletDropdown(!walletDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface border border-border hover:border-border-light transition-colors"
                  data-testid="wallet-connected-btn"
                >
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-sm text-text-secondary font-mono">{formatAddr(address)}</span>
                  <ChevronDown size={14} className="text-text-tertiary" />
                </button>
                {walletDropdown && (
                  <>
                    <div className="fixed inset-0" onClick={() => setWalletDropdown(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-surface-elevated border border-border rounded-xl shadow-2xl overflow-hidden">
                      <button
                        onClick={copyAddress}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:bg-surface-hover transition-colors"
                        data-testid="copy-address-btn"
                      >
                        {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                        {copied ? 'Copie !' : 'Copier adresse'}
                      </button>
                      <Link
                        to="/profile"
                        onClick={() => setWalletDropdown(false)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-secondary hover:bg-surface-hover transition-colors"
                      >
                        <Wallet size={16} />
                        Mon Profil
                      </Link>
                      <button
                        onClick={() => { disconnectWallet(); setWalletDropdown(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-error hover:bg-surface-hover transition-colors border-t border-divider"
                        data-testid="disconnect-btn"
                      >
                        <LogOut size={16} />
                        Deconnecter
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-all duration-200 disabled:opacity-50 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                data-testid="connect-wallet-btn"
              >
                <Wallet size={16} />
                {connecting ? 'Connexion...' : 'Connecter Wallet'}
              </button>
            )}

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-text-secondary hover:bg-surface-hover transition-colors"
              data-testid="mobile-menu-btn"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-bg/95 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'text-primary bg-primary/10'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
                data-testid={`mobile-nav-${item.label.toLowerCase()}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* No Wallet Modal - Desktop only (shows both options) */}
      {walletError && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center px-4" onClick={() => clearError()} data-testid="no-wallet-modal">
          <div className="bg-surface-elevated border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <AlertCircle size={20} className="text-warning" />
              </div>
              <div>
                <p className="font-bold text-text-primary text-sm">Wallet non detecte</p>
                <p className="text-xs text-text-secondary">Extension Phantom non trouvee</p>
              </div>
            </div>
            <p className="text-sm text-text-secondary mb-5">
              Choisissez une option pour connecter votre wallet Phantom :
            </p>
            <div className="space-y-3">
              {/* Option 1: Open Phantom app via deep-link */}
              <button
                onClick={handleDeepLinkConnect}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold shadow-[0_0_16px_rgba(139,92,246,0.3)] hover:bg-primary-dark transition-colors"
                data-testid="open-phantom-app-btn"
              >
                <ExternalLink size={16} /> Ouvrir l'app Phantom
              </button>
              {/* Option 2: Install extension */}
              <a
                href="https://phantom.app/download"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-colors"
                data-testid="install-phantom-btn"
              >
                <Download size={16} /> Installer l'extension
              </a>
              <button
                onClick={clearError}
                className="w-full px-4 py-2 rounded-xl text-text-tertiary text-xs hover:text-text-secondary transition-colors"
                data-testid="close-wallet-modal-btn"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
