import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { getConfig, getPresaleProgress, createPresalePurchase } from '../utils/api';
import { CreditCard, Coins, Users, Info, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';
const MIN_PURCHASE = 100;

export default function Presale() {
  const { address, connected } = useWallet();
  const [searchParams] = useSearchParams();
  const urlRef = searchParams.get('ref') || '';
  const [config, setConfig] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '',
    walletAddress: address || '', tokenAmount: '', referralCode: urlRef,
  });

  useEffect(() => {
    getConfig().then(r => setConfig(r.data)).catch(() => {});
    getPresaleProgress().then(r => setProgress(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (address) updateField('walletAddress', address);
  }, [address]);

  useEffect(() => {
    if (urlRef) updateField('referralCode', urlRef);
  }, [urlRef]);

  const totalPrice = parseFloat(formData.tokenAmount) * (config?.tokenPrice || 0.20);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!formData.firstName.trim()) e.firstName = 'Requis';
    if (!formData.lastName.trim()) e.lastName = 'Requis';
    if (!formData.walletAddress.trim()) e.walletAddress = 'Adresse wallet requise';
    if (formData.email && !formData.email.includes('@')) e.email = 'Email invalide';
    const amt = parseInt(formData.tokenAmount);
    if (!formData.tokenAmount || isNaN(amt) || amt < MIN_PURCHASE) e.tokenAmount = `Min ${MIN_PURCHASE} tokens`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePurchase = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const hostUrl = API_URL || window.location.origin;
      const res = await createPresalePurchase({
        firstName: formData.firstName, lastName: formData.lastName,
        email: formData.email, walletAddress: formData.walletAddress,
        tokenAmount: parseInt(formData.tokenAmount), paymentMethod,
        referralCode: formData.referralCode || undefined, hostUrl,
      });
      if (res.data.success) {
        if (paymentMethod === 'card' && res.data.checkoutUrl) {
          window.open(res.data.checkoutUrl, '_blank');
        } else if (paymentMethod === 'crypto' && res.data.solanaAddress) {
          navigator.clipboard.writeText(res.data.solanaAddress);
          alert(`Envoyez $${totalPrice.toFixed(2)} USD en SOL ou USDC a:\n\n${res.data.solanaAddress}\n\n(Adresse copiee)`);
          setFormData(prev => ({ ...prev, firstName: '', lastName: '', email: '', tokenAmount: '' }));
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Erreur. Reessayez.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(2)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10" data-testid="presale-page">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-lg">Q</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">QUANTUM Pre-Sale</h1>
        <p className="text-sm text-text-secondary">Allocation anticipee a prix exclusif</p>
      </div>

      {/* Progress */}
      {progress && (
        <div className="bg-surface border border-primary/20 rounded-2xl p-5 mb-8" data-testid="presale-progress">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-text-primary">Progression de la Levee</span>
            <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded flex items-center gap-1">
              <Users size={12} /> {progress.participants} participants
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-xl font-bold text-primary">{formatCurrency(progress.total_raised)}</span>
            <span className="text-sm text-text-tertiary">/ {formatCurrency(progress.goal)}</span>
          </div>
          <div className="h-2.5 bg-surface-elevated rounded-full overflow-hidden mb-2">
            <div className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full" style={{ width: `${Math.min(progress.progress_percentage, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-text-tertiary">
            <span>{progress.progress_percentage.toFixed(1)}%</span>
            <span>Reste: {formatCurrency(progress.remaining)}</span>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-text-secondary mb-1">Prix Token</p>
          <p className="text-xl font-bold text-text-primary">${config?.tokenPrice || '0.20'}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-text-secondary mb-1">Min. Achat</p>
          <p className="text-xl font-bold text-text-primary">{MIN_PURCHASE} QTM</p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4 mb-8">
        <h2 className="text-base font-semibold text-text-primary">Details d'achat</h2>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Prenom *" value={formData.firstName} onChange={v => updateField('firstName', v)} error={errors.firstName} placeholder="Jean" testid="input-firstname" />
          <InputField label="Nom *" value={formData.lastName} onChange={v => updateField('lastName', v)} error={errors.lastName} placeholder="Dupont" testid="input-lastname" />
        </div>
        <InputField label="Email" value={formData.email} onChange={v => updateField('email', v)} error={errors.email} placeholder="jean@example.com" type="email" testid="input-email" />
        <InputField label="Wallet Solana *" value={formData.walletAddress} onChange={v => updateField('walletAddress', v)} error={errors.walletAddress} placeholder="Adresse wallet" mono testid="input-wallet" />
        <InputField label="Tokens QUANTUM *" value={formData.tokenAmount} onChange={v => updateField('tokenAmount', v.replace(/[^0-9]/g, ''))} error={errors.tokenAmount} placeholder={`Min ${MIN_PURCHASE}`} type="number" testid="input-tokens" />
        <InputField label="Code Parrainage" value={formData.referralCode} onChange={v => updateField('referralCode', v.toUpperCase())} placeholder="QTMXXXXX (optionnel)" mono testid="input-referral" />
        {formData.referralCode && (
          <p className="text-xs text-success">Code parrainage applique</p>
        )}

        {formData.tokenAmount && !isNaN(totalPrice) && totalPrice > 0 && (
          <div className="flex items-center justify-between bg-surface-elevated border border-primary rounded-xl p-4" data-testid="total-price">
            <span className="text-sm text-text-secondary">Total</span>
            <span className="text-xl font-bold text-primary">${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-text-primary mb-3">Paiement</h2>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <button
            onClick={() => setPaymentMethod('card')}
            className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition-colors ${
              paymentMethod === 'card' ? 'border-primary bg-surface-elevated text-primary' : 'border-border bg-surface text-text-secondary'
            }`}
            data-testid="payment-card"
          >
            <CreditCard size={18} /> Carte
          </button>
          <button
            onClick={() => setPaymentMethod('crypto')}
            className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition-colors ${
              paymentMethod === 'crypto' ? 'border-primary bg-surface-elevated text-primary' : 'border-border bg-surface text-text-secondary'
            }`}
            data-testid="payment-crypto"
          >
            <Coins size={18} /> Crypto
          </button>
        </div>
        {paymentMethod === 'crypto' && (
          <p className="text-xs text-text-tertiary text-center">Accepte : SOL, USDC sur Solana</p>
        )}
      </div>

      {/* Terms */}
      <div className="flex items-start gap-2 bg-surface border border-border rounded-xl p-3 mb-6 text-xs text-text-tertiary">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>Tokens distribues au TGE. L'achat est definitif et non remboursable.</span>
      </div>

      {/* Submit */}
      <button
        onClick={handlePurchase}
        disabled={loading}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-base transition-all duration-200 disabled:opacity-50 shadow-[0_0_24px_rgba(139,92,246,0.4)] hover:shadow-[0_0_32px_rgba(139,92,246,0.6)]"
        data-testid="purchase-btn"
      >
        {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Finaliser l\'achat'}
      </button>
    </div>
  );
}

function InputField({ label, value, onChange, error, placeholder, type = 'text', mono, testid }) {
  return (
    <div>
      <label className="block text-sm text-text-secondary mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-surface border rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-tertiary outline-none transition-colors focus:border-primary ${
          error ? 'border-error' : 'border-border'
        } ${mono ? 'font-mono' : ''}`}
        data-testid={testid}
      />
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
}
