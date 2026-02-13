import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { getPresaleProgress, getAffiliateConfig } from '../utils/api';
import { Zap, Shield, Users, TrendingUp, ArrowRight, Wallet, ChevronRight, Globe, BarChart3, Lock, FileText } from 'lucide-react';

const WHITEPAPER_URL = 'https://customer-assets.emergentagent.com/job_d250e654-81d2-4281-9f8c-17d7ab214687/artifacts/wiexcfs8_Quantum%20IA%20Whitepaper%20v1.1.pdf.pdf.pdf';

export default function Landing() {
  const { connected, connectWallet, clearError, connecting } = useWallet();
  const [progress, setProgress] = useState(null);
  const [config, setConfig] = useState(null);
  const [searchParams] = useSearchParams();
  const ref = searchParams.get('ref');

  useEffect(() => {
    getPresaleProgress().then(r => setProgress(r.data)).catch(() => {});
    getAffiliateConfig().then(r => setConfig(r.data)).catch(() => {});
  }, []);

  const formatCurrency = (v) => {
    if (!v) return '$0';
    if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_60%)]" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-primary-dark/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 lg:pt-32 lg:pb-28">
          <div className="text-center max-w-4xl mx-auto">
            {ref && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 text-success text-sm mb-6">
                <Users size={14} />
                Code parrainage : <span className="font-bold font-mono">{ref}</span>
              </div>
            )}

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
              <Zap size={14} />
              Pre-Sale en cours
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              <span className="text-text-primary">L'investissement AI</span>
              <br />
              <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
                de nouvelle generation
              </span>
            </h1>

            <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
              Quantum IA combine intelligence artificielle et blockchain pour offrir
              des opportunites d'investissement exclusives. Participez a la pre-sale
              et rejoignez l'ecosysteme.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                to={ref ? `/presale?ref=${ref}` : '/presale'}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-base transition-all duration-200 shadow-[0_0_30px_rgba(139,92,246,0.35)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)]"
                data-testid="hero-cta-presale"
              >
                Acheter des Quantum
                <ArrowRight size={18} />
              </Link>
              {!connected && (
                <button
                  onClick={() => { clearError(); connectWallet(); }}
                  disabled={connecting}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-surface border border-border hover:border-border-light text-text-primary font-semibold text-base transition-all duration-200 disabled:opacity-50"
                  data-testid="hero-connect-wallet"
                >
                  <Wallet size={18} />
                  Connecter Wallet
                </button>
              )}
            </div>

            {/* Presale Progress */}
            {progress && (
              <div className="max-w-xl mx-auto bg-surface border border-border rounded-2xl p-6" data-testid="presale-progress-card">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-text-secondary">Progression de la Levee</span>
                  <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-md">
                    {progress.participants || 0} participants
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold text-primary">{formatCurrency(progress.total_raised)}</span>
                  <span className="text-sm text-text-tertiary">/ {formatCurrency(progress.goal)}</span>
                </div>
                <div className="h-2.5 bg-surface-elevated rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(progress.progress_percentage || 0, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-text-tertiary">
                  <span>{(progress.progress_percentage || 0).toFixed(1)}%</span>
                  <span>Reste: {formatCurrency(progress.remaining)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-20 lg:py-28" data-testid="value-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-base sm:text-lg font-semibold text-primary mb-3">Pourquoi Quantum IA</h2>
            <p className="text-2xl sm:text-3xl font-bold text-text-primary">Un ecosysteme complet</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: BarChart3, title: 'Analyse AI', desc: 'Algorithmes avances pour identifier les meilleures opportunites d\'investissement en temps reel.' },
              { icon: Shield, title: 'Securite On-Chain', desc: 'Vos actifs sont proteges par la blockchain Solana, rapide et securisee.' },
              { icon: Users, title: 'Systeme MLM 5 niveaux', desc: 'Gagnez des commissions sur 5 niveaux avec un programme d\'affiliation puissant.' },
              { icon: TrendingUp, title: 'Presale Exclusive', desc: 'Achetez des tokens QTM a 50% du prix de listing avant le lancement.' },
              { icon: Globe, title: 'Ecosysteme Global', desc: 'Acces aux opportunites d\'investissement AI curees a travers le monde.' },
              { icon: Lock, title: 'Transparence', desc: 'Toutes les transactions et commissions sont verifiables on-chain.' },
            ].map((item, i) => (
              <div
                key={i}
                className="group bg-surface border border-border rounded-2xl p-6 hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <item.icon size={22} className="text-primary" />
                </div>
                <h3 className="text-base font-semibold text-text-primary mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / Presale Info */}
      <section className="py-20 lg:py-28 border-t border-border" data-testid="trust-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-primary mb-3">Pre-Sale Quantum</h2>
              <p className="text-2xl sm:text-3xl font-bold text-text-primary mb-6">50% du prix de listing</p>
              <p className="text-text-secondary leading-relaxed mb-8">
                La pre-sale Quantum IA vous permet d'acquerir des tokens QTM au meilleur prix avant
                le listing officiel prevu le 1er Juin 2026. Paiement par carte bancaire ou crypto accepte.
              </p>
              <div className="space-y-4">
                {[
                  { label: 'Prix Pre-Sale', value: '$0.20 / QTM' },
                  { label: 'Minimum', value: '100 QTM ($20)' },
                  { label: 'Paiement', value: 'Carte bancaire & Crypto' },
                  { label: 'Listing', value: '1er Juin 2026' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-divider">
                    <span className="text-sm text-text-secondary">{item.label}</span>
                    <span className="text-sm font-semibold text-text-primary">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Commission Rates */}
            <div className="bg-surface border border-border rounded-2xl p-8">
              <h3 className="text-lg font-bold text-text-primary mb-2">Programme d'Affiliation</h3>
              <p className="text-sm text-text-secondary mb-6">Gagnez des commissions sur 5 niveaux</p>
              <div className="space-y-3">
                {[
                  { lvl: 1, pct: 20, color: '#8B5CF6' },
                  { lvl: 2, pct: 10, color: '#A78BFA' },
                  { lvl: 3, pct: 5, color: '#10B981' },
                  { lvl: 4, pct: 2.5, color: '#F59E0B' },
                  { lvl: 5, pct: 1, color: '#6B7280' },
                ].map((item) => (
                  <div key={item.lvl} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold" style={{ backgroundColor: item.color + '20', color: item.color }}>
                      N{item.lvl}
                    </div>
                    <div className="flex-1">
                      <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${item.pct * 2.6}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-text-primary w-14 text-right">{item.pct}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-divider flex justify-between">
                <span className="text-sm text-text-secondary">Total par achat</span>
                <span className="text-sm font-bold text-primary">38.5%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Whitepaper */}
      <section className="py-20 lg:py-28 border-t border-border" data-testid="whitepaper-section">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <FileText size={28} className="text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
            En savoir plus sur Quantum IA
          </h2>
          <p className="text-text-secondary mb-8 max-w-xl mx-auto">
            Decouvrez notre vision, la technologie et la tokenomics dans le White Paper officiel.
          </p>
          <a
            href={WHITEPAPER_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-surface border border-primary/30 hover:border-primary text-primary font-semibold text-base transition-all duration-200 hover:bg-primary/5"
            data-testid="read-whitepaper-btn"
          >
            <FileText size={18} />
            Read the White Paper
          </a>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-28 border-t border-border" data-testid="cta-section">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
            Pret a rejoindre l'ecosysteme ?
          </h2>
          <p className="text-text-secondary mb-8">
            Participez a la pre-sale maintenant et beneficiez du meilleur prix.
          </p>
          <Link
            to={ref ? `/presale?ref=${ref}` : '/presale'}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-base transition-all duration-200 shadow-[0_0_30px_rgba(139,92,246,0.35)]"
            data-testid="cta-bottom-presale"
          >
            Acheter des Quantum
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-xs">Q</span>
              </div>
              <span className="text-sm text-text-secondary">Quantum IA - v1.0.0</span>
            </div>
            <div className="flex gap-6 text-sm text-text-tertiary">
              <span>Solana Mainnet</span>
              <span>USDC Polygon (Card2Crypto)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
