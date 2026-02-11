import React, { useState } from 'react';
import { Rocket, DollarSign, ThumbsUp } from 'lucide-react';

const OPPORTUNITIES = [
  { id: '1', companyName: 'NeuroTrade AI', sector: 'AI Trading', status: 'Open', pitch: 'Plateforme de trading quantitatif propulsee par l\'IA avec des rendements superieurs au marche.', stage: 'Series A', requestedAmount: 2500000, videoThumbnail: '', votesYes: 847, votesNo: 123 },
  { id: '2', companyName: 'BlockGuard Security', sector: 'Cybersecurity', status: 'Funded', pitch: 'Solution de securite blockchain de nouvelle generation pour les protocoles DeFi.', stage: 'Seed', requestedAmount: 800000, videoThumbnail: '', votesYes: 1200, votesNo: 89 },
  { id: '3', companyName: 'DataVault Protocol', sector: 'Data Storage', status: 'Open', pitch: 'Stockage de donnees decentralise avec encryption zero-knowledge et acces instantane.', stage: 'Pre-Seed', requestedAmount: 500000, videoThumbnail: '', votesYes: 456, votesNo: 234 },
  { id: '4', companyName: 'MetaHealth AI', sector: 'Healthcare', status: 'Closed', pitch: 'Diagnostic medical assiste par IA avec precision de 98.5% sur les pathologies courantes.', stage: 'Series B', requestedAmount: 5000000, videoThumbnail: '', votesYes: 2100, votesNo: 300 },
];

export default function Opportunities() {
  const [filter, setFilter] = useState('All');

  const filtered = OPPORTUNITIES.filter(o => filter === 'All' || o.status === filter);
  const formatAmt = (a) => a >= 1000000 ? `$${(a / 1000000).toFixed(1)}M` : `$${(a / 1000).toFixed(0)}K`;

  const statusColor = (s) => s === 'Open' ? 'text-success bg-success/10' : s === 'Funded' ? 'text-primary bg-primary/10' : 'text-text-tertiary bg-surface-elevated';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" data-testid="opportunities-page">
      <h1 className="text-2xl font-extrabold text-text-primary mb-1">AI Opportunities</h1>
      <p className="text-sm text-text-secondary mb-6">Votez sur les investissements mensuels</p>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {['All', 'Open', 'Closed', 'Funded'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border whitespace-nowrap transition-colors ${
              filter === f ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-text-secondary hover:text-text-primary'
            }`}
            data-testid={`filter-${f.toLowerCase()}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {filtered.map((opp) => {
          const total = opp.votesYes + opp.votesNo;
          const pct = total > 0 ? (opp.votesYes / total) * 100 : 0;
          return (
            <div key={opp.id} className="bg-surface border border-border rounded-2xl overflow-hidden hover:border-border-light transition-colors" data-testid={`opportunity-${opp.id}`}>
              <div className="h-40 bg-gradient-to-br from-primary/20 to-surface-elevated flex items-center justify-center">
                <span className="text-4xl font-bold text-primary/30">{opp.companyName.charAt(0)}</span>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">{opp.companyName}</h3>
                    <span className="inline-block text-xs text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded mt-1">{opp.sector}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded flex items-center gap-1 ${statusColor(opp.status)}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {opp.status}
                  </span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed mb-3 line-clamp-2">{opp.pitch}</p>
                <div className="flex gap-4 mb-3">
                  <div className="flex items-center gap-1 text-sm"><Rocket size={14} className="text-primary" /> <span className="font-semibold text-text-primary">{opp.stage}</span></div>
                  <div className="flex items-center gap-1 text-sm"><DollarSign size={14} className="text-warning" /> <span className="font-semibold text-text-primary">{formatAmt(opp.requestedAmount)}</span></div>
                </div>
                {opp.status === 'Open' && (
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-secondary">Community Vote</span>
                      <span className="text-success font-bold">{pct.toFixed(1)}% YES</span>
                    </div>
                    <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                      <div className="h-full bg-success rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
