import React, { useState, useEffect } from 'react';
import { useWallet, QUANTUM_PRICE_USD } from '../contexts/WalletContext';
import { getNotifications, markNotificationsRead, clearNotifications } from '../utils/api';
import { Wallet, Copy, Check, Bell, BellOff, ChevronDown, ChevronUp, Trash2, Globe, BarChart2, LogOut, Loader2 } from 'lucide-react';

export default function Profile() {
  const {
    connected, address, connecting, connectWallet, disconnectWallet,
    quantumBalance, solBalance, usdValue, eurValue, error, clearError,
  } = useWallet();

  const [notifications, setNotifications] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(false);
  const [network, setNetwork] = useState('mainnet');
  const [notifList, setNotifList] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const s = localStorage.getItem('userSettings');
    if (s) {
      const p = JSON.parse(s);
      if (p.notifications !== undefined) setNotifications(p.notifications);
      if (p.priceAlerts !== undefined) setPriceAlerts(p.priceAlerts);
      if (p.network) setNetwork(p.network);
    }
  }, []);

  useEffect(() => {
    if (connected && address) fetchNotifications();
  }, [connected, address]);

  const saveSetting = (key, value) => {
    const s = JSON.parse(localStorage.getItem('userSettings') || '{}');
    s[key] = value;
    localStorage.setItem('userSettings', JSON.stringify(s));
  };

  const fetchNotifications = async () => {
    if (!address) return;
    try {
      const r = await getNotifications(address);
      setNotifList(r.data.notifications || []);
      setUnread(r.data.unread_count || 0);
    } catch (e) {}
  };

  const handleMarkRead = async () => {
    if (!address || unread === 0) return;
    await markNotificationsRead(address).catch(() => {});
    setUnread(0);
    setNotifList(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClear = async () => {
    if (!address || !confirm('Effacer toutes les notifications ?')) return;
    await clearNotifications(address).catch(() => {});
    setNotifList([]);
    setUnread(0);
  };

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmtAddr = (a) => `${a.slice(0, 6)}...${a.slice(-4)}`;
  const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  if (!connected) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center" data-testid="profile-disconnected">
        <Wallet size={56} className="text-text-tertiary mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Wallet Non Connecte</h2>
        <p className="text-sm text-text-secondary mb-8">Connectez votre wallet Solana pour gerer votre compte</p>
        <button onClick={() => { clearError(); connectWallet(); }} disabled={connecting} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-50 shadow-[0_0_20px_rgba(139,92,246,0.3)]" data-testid="connect-wallet-profile">
          {connecting ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
          {connecting ? 'Connexion...' : 'Connecter Wallet'}
        </button>
        {error === 'NO_WALLET' && <p className="mt-4 text-sm text-warning">Aucun wallet Solana detecte. Installez Phantom.</p>}
        {error && error !== 'NO_WALLET' && <p className="mt-4 text-sm text-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="profile-page">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Compte</h1>

      {/* Wallet Card */}
      <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <Wallet size={22} className="text-primary" />
          <button onClick={copyAddress} className="p-2 rounded-lg bg-surface-elevated hover:bg-surface-hover transition-colors" data-testid="copy-address-profile">
            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} className="text-text-secondary" />}
          </button>
        </div>
        <p className="text-xs text-text-tertiary mb-1">Adresse Wallet</p>
        <p className="text-sm font-semibold text-text-primary font-mono">{fmtAddr(address)}</p>
      </div>

      {/* Balances */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Soldes On-Chain</h2>
        <div className="bg-surface border border-border rounded-2xl divide-y divide-divider">
          <Row label="Quantum (QTM)" value={quantumBalance ? quantumBalance.amount.toLocaleString() : '0'} />
          <Row label="Valeur USD" value={`$${usdValue.toFixed(2)}`} valueClass="text-success" />
          <Row label="Valeur EUR" value={`€${eurValue.toFixed(2)}`} />
          <Row label="Solde SOL" value={`${solBalance.toFixed(4)} SOL`} />
        </div>
      </div>

      {/* Notifications */}
      <div className="mb-6">
        <button onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) handleMarkRead(); }} className="w-full flex items-center justify-between mb-3" data-testid="toggle-notifications">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-primary" />
            <span className="text-sm font-semibold text-text-primary">Notifications</span>
            {unread > 0 && <span className="bg-error text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{unread}</span>}
          </div>
          {showNotifs ? <ChevronUp size={18} className="text-text-secondary" /> : <ChevronDown size={18} className="text-text-secondary" />}
        </button>
        {showNotifs && (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            {notifList.length === 0 ? (
              <div className="py-8 text-center"><BellOff size={28} className="text-text-tertiary mx-auto mb-2" /><p className="text-sm text-text-tertiary">Aucune notification</p></div>
            ) : (
              <>
                {notifList.map(n => (
                  <div key={n.id} className={`flex gap-3 p-4 border-b border-divider ${!n.read ? 'bg-primary/5' : ''}`}>
                    <div className="w-9 h-9 rounded-lg bg-surface-elevated flex items-center justify-center shrink-0">
                      <Bell size={16} className={n.type === 'commission_received' ? 'text-success' : 'text-primary'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary">{n.title}</p>
                      <p className="text-xs text-text-secondary">{n.body}</p>
                      <p className="text-[10px] text-text-tertiary mt-1">{fmtDate(n.created_at)}</p>
                    </div>
                  </div>
                ))}
                <button onClick={handleClear} className="w-full flex items-center justify-center gap-2 p-3 text-sm text-error hover:bg-surface-hover transition-colors" data-testid="clear-notifications">
                  <Trash2 size={14} /> Effacer tout
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Parametres</h2>
        <div className="bg-surface border border-border rounded-2xl divide-y divide-divider">
          <ToggleRow icon={Bell} label="Push Notifications" value={notifications} onChange={(v) => { setNotifications(v); saveSetting('notifications', v); }} />
          <ToggleRow icon={BarChart2} label="Alertes de Prix" value={priceAlerts} onChange={(v) => { setPriceAlerts(v); saveSetting('priceAlerts', v); }} />
          <button onClick={() => { const n = network === 'mainnet' ? 'devnet' : 'mainnet'; setNetwork(n); saveSetting('network', n); }} className="w-full flex items-center justify-between px-4 py-4 hover:bg-surface-hover transition-colors">
            <div className="flex items-center gap-3"><Globe size={16} className="text-text-secondary" /><span className="text-sm text-text-primary">Reseau</span></div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${network === 'mainnet' ? 'bg-success' : 'bg-warning'}`} />
              <span className="text-sm text-text-secondary">{network === 'mainnet' ? 'Mainnet' : 'Devnet'}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Disconnect */}
      <button onClick={() => { if (confirm('Deconnecter le wallet ?')) disconnectWallet(); }} className="w-full flex items-center justify-center gap-2 p-4 bg-surface border border-error/30 rounded-2xl text-error text-sm font-semibold hover:bg-error/5 transition-colors" data-testid="disconnect-wallet-btn">
        <LogOut size={18} /> Deconnecter Wallet
      </button>

      <div className="text-center mt-8 space-y-1">
        <p className="text-xs text-text-tertiary">Quantum IA v1.0.0</p>
        <p className="text-xs text-text-tertiary">Solana Mainnet-Beta</p>
      </div>
    </div>
  );
}

function Row({ label, value, valueClass }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className={`text-sm font-bold text-text-primary ${valueClass || ''}`}>{value}</span>
    </div>
  );
}

function ToggleRow({ icon: Icon, label, value, onChange }) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="flex items-center gap-3"><Icon size={16} className="text-text-secondary" /><span className="text-sm text-text-primary">{label}</span></div>
      <button onClick={() => onChange(!value)} className={`w-10 h-6 rounded-full transition-colors relative ${value ? 'bg-primary' : 'bg-surface-elevated'}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full transition-transform ${value ? 'bg-white translate-x-5' : 'bg-text-tertiary translate-x-1'}`} />
      </button>
    </div>
  );
}
