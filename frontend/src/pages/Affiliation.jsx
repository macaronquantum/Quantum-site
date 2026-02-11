import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { getAffiliateStats, getAffiliateConfig, getLevelTransactions } from '../utils/api';
import { Link as LinkIcon, Share2, Copy, Check, Users, ChevronRight, X, Wallet, RefreshCw, Loader2 } from 'lucide-react';

const LEVEL_COLORS = { 1: '#8B5CF6', 2: '#A78BFA', 3: '#10B981', 4: '#F59E0B', 5: '#6B7280' };

export default function Affiliation() {
  const { address, connected, connectWallet } = useWallet();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [levelTxs, setLevelTxs] = useState([]);
  const [loadingTxs, setLoadingTxs] = useState(false);
  const [copied, setCopied] = useState('');

  const fetchData = useCallback(async () => {
    if (!address) return;
    try {
      const [s, c] = await Promise.all([getAffiliateStats(address), getAffiliateConfig()]);
      setStats(s.data);
      setConfig(c.data);
    } catch (e) { console.error(e); }
  }, [address]);

  useEffect(() => {
    if (connected && address) { setLoading(true); fetchData().finally(() => setLoading(false)); }
    else setLoading(false);
  }, [address, connected, fetchData]);

  const openLevel = async (level) => {
    setSelectedLevel(level);
    setLoadingTxs(true);
    try {
      const r = await getLevelTransactions(address, level);
      setLevelTxs(r.data.transactions || []);
    } catch (e) { setLevelTxs([]); }
    finally { setLoadingTxs(false); }
  };

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const shareLink = () => {
    if (!stats?.referral_link) return;
    if (navigator.share) {
      navigator.share({ title: 'Quantum IA - Parrainage', text: `Rejoins Quantum IA avec mon code: ${stats.referral_code}`, url: stats.referral_link });
    } else {
      copyText(stats.referral_link, 'link');
    }
  };

  const fmtWallet = (w) => w?.length > 12 ? `${w.slice(0, 6)}...${w.slice(-4)}` : w || '-';
  const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (!connected) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center" data-testid="affiliation-disconnected">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Users size={36} className="text-primary" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Programme d'Affiliation</h2>
        <p className="text-sm text-text-secondary mb-6">Connectez votre wallet pour acceder a votre tableau de bord MLM</p>
        <div className="space-y-3 text-left max-w-xs mx-auto mb-8">
          {['5 niveaux de commission', 'Jusqu\'a 38.5% de commission totale', 'Suivi en temps reel'].map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-text-secondary">
              <Check size={16} className="text-success shrink-0" /> {f}
            </div>
          ))}
        </div>
        <button onClick={connectWallet} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold shadow-[0_0_20px_rgba(139,92,246,0.3)]" data-testid="connect-wallet-affiliation">
          <Wallet size={16} /> Connecter Wallet
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={32} className="text-primary animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8" data-testid="affiliation-page">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Programme MLM</h1>
      <p className="text-sm text-text-secondary mb-8">Systeme multi-niveau a 5 niveaux</p>

      {/* Referral Card */}
      <div className="bg-surface border border-border rounded-2xl p-5 mb-8" data-testid="referral-code-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><LinkIcon size={18} className="text-primary" /></div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Votre Code de Parrainage</p>
            <p className="text-xs text-text-secondary">Partagez pour gagner des commissions</p>
          </div>
        </div>
        <button onClick={() => copyText(stats?.referral_code || '', 'code')} className="w-full flex items-center justify-center gap-3 bg-surface-elevated border border-border-light rounded-xl p-4 mb-4 hover:bg-surface-hover transition-colors" data-testid="referral-code-display">
          <span className="text-xl font-bold text-primary font-mono tracking-[3px]">{stats?.referral_code || '-'}</span>
          {copied === 'code' ? <Check size={16} className="text-success" /> : <Copy size={16} className="text-text-secondary" />}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => copyText(stats?.referral_link || '', 'link')} className="flex items-center justify-center gap-2 bg-surface-elevated border border-border rounded-xl py-3 text-sm text-text-primary hover:bg-surface-hover transition-colors" data-testid="copy-link-btn">
            <LinkIcon size={16} /> {copied === 'link' ? 'Copie !' : 'Copier Lien'}
          </button>
          <button onClick={shareLink} className="flex items-center justify-center gap-2 bg-primary rounded-xl py-3 text-sm text-white font-medium shadow-[0_0_16px_rgba(139,92,246,0.3)]" data-testid="share-btn">
            <Share2 size={16} /> Partager
          </button>
        </div>
      </div>

      {/* Global Stats */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Vue Globale</h2>
        <div className="bg-surface border border-border rounded-2xl p-5" data-testid="global-stats-card">
          <div className="text-center py-2 mb-4">
            <p className="text-xs text-text-secondary mb-1">Total Gagne</p>
            <p className="text-3xl font-bold text-primary">${(stats?.total_earnings || 0).toFixed(2)}</p>
          </div>
          <div className="border-t border-divider pt-4 grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'En attente', value: stats?.pending_earnings, color: 'text-warning' },
              { label: 'Confirme', value: stats?.confirmed_earnings, color: 'text-primary' },
              { label: 'Paye', value: stats?.paid_earnings, color: 'text-success' },
            ].map((s, i) => (
              <div key={i}>
                <p className="text-xs text-text-tertiary">{s.label}</p>
                <p className={`text-sm font-semibold ${s.color}`}>${(s.value || 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-divider mt-4 pt-4 flex items-center justify-center gap-2 text-sm text-text-secondary">
            <Users size={16} /> {stats?.total_referrals || 0} filleuls dans votre reseau
          </div>
        </div>
      </div>

      {/* Levels */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Detail par Niveau</h2>
        <p className="text-xs text-text-tertiary mb-3">Cliquez sur un niveau pour voir les transactions</p>
        <div className="space-y-3">
          {stats?.levels?.map((lvl) => {
            const color = LEVEL_COLORS[lvl.level] || '#6B7280';
            const rate = config?.commission_rates?.[String(lvl.level)];
            return (
              <button key={lvl.level} onClick={() => openLevel(lvl.level)} className="w-full bg-surface border border-border rounded-xl p-4 text-left hover:border-border-light transition-colors" data-testid={`level-${lvl.level}-card`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold" style={{ backgroundColor: color + '20', color }}>N{lvl.level}</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">Niveau {lvl.level}</p>
                    <p className="text-xs font-medium" style={{ color }}>{rate?.percentage || 0}% de commission</p>
                  </div>
                  <div className="text-right mr-2">
                    <p className="text-lg font-bold text-text-primary">{lvl.referral_count}</p>
                    <p className="text-xs text-text-secondary">filleuls</p>
                  </div>
                  <ChevronRight size={18} className="text-text-tertiary" />
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-divider pt-3 text-center">
                  <div><p className="text-xs text-text-tertiary">Total</p><p className="text-sm font-semibold text-text-primary">${lvl.total_commission.toFixed(2)}</p></div>
                  <div><p className="text-xs text-text-tertiary">En attente</p><p className="text-sm font-semibold text-warning">${lvl.pending_commission.toFixed(2)}</p></div>
                  <div><p className="text-xs text-text-tertiary">Paye</p><p className="text-sm font-semibold text-success">${lvl.paid_commission.toFixed(2)}</p></div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Commission Rates */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-3">Taux de Commission</h2>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="grid grid-cols-5 gap-3 mb-4">
            {Object.entries(config?.commission_rates || {}).map(([lvl, rate]) => (
              <div key={lvl} className="text-center">
                <p className="text-xs text-text-tertiary mb-1">Niv. {lvl}</p>
                <p className="text-lg font-bold" style={{ color: LEVEL_COLORS[Number(lvl)] }}>{rate.percentage}%</p>
              </div>
            ))}
          </div>
          <div className="border-t border-divider pt-3 flex justify-between text-sm">
            <span className="text-text-secondary">Total distribue par achat</span>
            <span className="font-bold text-primary">{config?.total_commission_percentage?.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Level Detail Modal */}
      {selectedLevel !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setSelectedLevel(null)}>
          <div className="bg-bg border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()} data-testid="level-modal">
            <div className="flex items-center justify-between p-5 border-b border-divider">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold" style={{ backgroundColor: LEVEL_COLORS[selectedLevel] + '20', color: LEVEL_COLORS[selectedLevel] }}>N{selectedLevel}</div>
                <div>
                  <p className="font-bold text-text-primary">Niveau {selectedLevel}</p>
                  <p className="text-sm text-text-secondary">{config?.commission_rates?.[String(selectedLevel)]?.percentage || 0}% de commission</p>
                </div>
              </div>
              <button onClick={() => setSelectedLevel(null)} className="w-9 h-9 rounded-full bg-surface-elevated flex items-center justify-center">
                <X size={18} className="text-text-secondary" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-5">
              {loadingTxs ? (
                <div className="flex justify-center py-10"><Loader2 size={24} className="text-primary animate-spin" /></div>
              ) : levelTxs.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-text-tertiary text-sm">Aucune transaction a ce niveau</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {levelTxs.map(tx => (
                    <div key={tx.id} className="bg-surface border border-border rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-primary font-mono">{fmtWallet(tx.source_wallet)}</p>
                        <p className="text-xs text-text-tertiary">{fmtDate(tx.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-success">+${tx.amount.toFixed(2)}</p>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${tx.status === 'paid' ? 'bg-success/20 text-success' : tx.status === 'confirmed' ? 'bg-primary/20 text-primary' : 'bg-warning/20 text-warning'}`}>
                          {tx.status === 'paid' ? 'Paye' : tx.status === 'confirmed' ? 'Confirme' : 'En attente'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
