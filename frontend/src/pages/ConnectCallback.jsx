import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

export default function ConnectCallback() {
  const { sid } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setConnectedAddress } = useWallet();
  const [status, setStatus] = useState('Traitement en cours...');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const process = async () => {
      try {
        const errorCode = searchParams.get('errorCode');
        if (errorCode) {
          const errMsg = searchParams.get('errorMessage') || 'Connexion annulee';
          setError(`Phantom: ${decodeURIComponent(errMsg)}`);
          setTimeout(() => navigate('/portfolio', { replace: true }), 3000);
          return;
        }

        const phantomPubKey = searchParams.get('phantom_encryption_public_key');
        const nonce = searchParams.get('nonce');
        const data = searchParams.get('data');

        if (!phantomPubKey || !nonce || !data) {
          setError('Parametres Phantom manquants');
          setTimeout(() => navigate('/', { replace: true }), 3000);
          return;
        }

        if (!sid) {
          setError('Session ID manquant');
          setTimeout(() => navigate('/', { replace: true }), 3000);
          return;
        }

        setStatus('Recuperation de la session...');

        const response = await fetch(`${API_URL}/api/wallet/session/${sid}`);
        const result = await response.json();

        if (result.error || !result.keypair) {
          setError(result.error || 'Session expiree ou introuvable');
          setTimeout(() => navigate('/', { replace: true }), 3000);
          return;
        }

        setStatus('Decryption en cours...');

        const keypair = JSON.parse(result.keypair);
        const secretKey = new Uint8Array(keypair.sec);
        const phantomBytes = bs58.decode(phantomPubKey);
        const nonceBytes = bs58.decode(nonce);
        const dataBytes = bs58.decode(data);

        const sharedSecret = nacl.box.before(phantomBytes, secretKey);
        const decrypted = nacl.box.open.after(dataBytes, nonceBytes, sharedSecret);

        if (!decrypted) {
          setError('Echec de la decryption');
          setTimeout(() => navigate('/', { replace: true }), 3000);
          return;
        }

        const payload = JSON.parse(Buffer.from(decrypted).toString('utf8'));

        if (!payload.public_key) {
          setError('Reponse Phantom invalide');
          setTimeout(() => navigate('/', { replace: true }), 3000);
          return;
        }

        setSuccess(true);
        setStatus('Wallet connecte !');
        setConnectedAddress(payload.public_key);
        setTimeout(() => navigate('/portfolio', { replace: true }), 1500);

      } catch (err) {
        console.error('[ConnectCallback] Error:', err);
        setError(err?.message || 'Erreur inconnue');
        setTimeout(() => navigate('/', { replace: true }), 3000);
      }
    };

    process();
  }, [sid, searchParams, navigate, setConnectedAddress]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        {error ? (
          <div className="bg-error/10 border border-error/30 rounded-2xl p-6 text-center" data-testid="connect-error">
            <AlertCircle size={40} className="text-error mx-auto mb-4" />
            <p className="text-error font-bold text-lg mb-2">Erreur</p>
            <p className="text-error/80 text-sm mb-4">{error}</p>
            <p className="text-text-tertiary text-xs">Redirection...</p>
          </div>
        ) : success ? (
          <div className="bg-success/10 border border-success/30 rounded-2xl p-6 text-center" data-testid="connect-success">
            <CheckCircle2 size={40} className="text-success mx-auto mb-4" />
            <p className="text-success font-bold text-lg mb-2">{status}</p>
            <p className="text-text-tertiary text-xs">Redirection vers Portfolio...</p>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-2xl p-6 text-center" data-testid="connect-loading">
            <Loader2 size={40} className="text-primary mx-auto mb-4 animate-spin" />
            <p className="text-text-primary font-medium text-lg">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
