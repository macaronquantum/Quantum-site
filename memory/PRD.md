# Quantum DAO - Product Requirements Document

## Original Problem Statement
Application Expo/React Native pour Quantum DAO avec:
- Connexion wallet Solana (Phantom) fonctionnelle de bout en bout
- Récupération des données on-chain (balance Quantum token, SOL, conversion USD/EUR)
- Affichage des données sur les pages Portfolio, Profile après connexion
- Prix Quantum token hardcodé à $2.50 USD (pré-TGE)

## Target Users
- Investisseurs crypto intéressés par le DAO Quantum
- Utilisateurs de wallets Solana (principalement Phantom)

## Core Requirements
1. **Wallet Connection (Solana Only)**
   - Support Phantom wallet (extension browser + mobile app)
   - Deep-linking pour mobile via `expo-web-browser`
   - Popup polling pour web sans extension
   - Chiffrement X25519 avec `tweetnacl`

2. **On-Chain Data Fetching**
   - Balance Quantum token (Mint: 4KsZXRH3Xjd7z4CiuwgfNQstC2aHDLdJHv5u3tDixtLc)
   - Balance SOL
   - Conversion USD/EUR en temps réel

3. **UI/UX**
   - Landing page avec "Access Platform"
   - Portfolio avec état connecté/déconnecté
   - Profile avec paramètres utilisateur
   - Opportunities avec filtres et votes
   - Pre-Sale form avec validation
   - Referral dashboard

## Technical Architecture
- **Frontend**: React Native + Expo Router
- **Blockchain**: Solana Mainnet-Beta (JSON-RPC direct)
- **Wallet**: Phantom via Universal Links
- **Crypto**: tweetnacl (lazy-loaded), bs58

## Key Files
- `/app/frontend/contexts/WalletContext.tsx` - Logique wallet
- `/app/frontend/utils/solanaRpc.ts` - Appels RPC Solana
- `/app/frontend/app/(tabs)/portfolio.tsx` - Page Portfolio
- `/app/frontend/app/(tabs)/profile.tsx` - Page Profile

## What's Implemented
- [x] Landing page avec navigation
- [x] Connexion wallet Phantom (web popup + mobile auth session)
- [x] Lazy-loading tweetnacl/bs58 (fix PRNG error)
- [x] Récupération balance Quantum on-chain
- [x] Récupération balance SOL
- [x] Conversion USD/EUR temps réel
- [x] Affichage données Portfolio/Profile
- [x] Formulaire Pre-Sale avec validation
- [x] Page Opportunities avec filtres
- [x] Navigation par onglets

## Mocked/Hardcoded
- **QUANTUM_PRICE_USD = $2.50** (pré-TGE, hardcodé dans solanaRpc.ts)

## Backlog (P2)
- [ ] Redesign barre de navigation inférieure (style "delta")
- [ ] Révision générale UI/UX (page settings)
- [ ] Ajouter data-testid sur éléments interactifs

## Testing Status
- Frontend: 100% pass (iteration_1.json)
- Wallet flow: Testé via logs console (popup s'ouvre correctement)
- Note: Test complet wallet impossible sans vrai Phantom installé
