# Quantum DAO - Product Requirements Document

## Original Problem Statement
Application Expo/React Native pour Quantum DAO avec:
- Connexion wallet Solana (Phantom) fonctionnelle de bout en bout
- Récupération des données on-chain (balance Quantum token, SOL, conversion USD/EUR)
- Affichage des données sur les pages Portfolio, Profile après connexion
- Prix Quantum token hardcodé à $2.50 USD (pré-TGE)
- **Système d'affiliation multi-niveau (MLM) à 5 niveaux**

## Target Users
- Investisseurs crypto intéressés par le DAO Quantum
- Utilisateurs de wallets Solana (principalement Phantom)
- Affiliés souhaitant monétiser leur réseau

## Core Requirements

### 1. Wallet Connection (Solana Only)
- Support Phantom wallet (extension browser + mobile app)
- Deep-linking pour mobile via `expo-web-browser`
- Popup polling pour web sans extension
- Chiffrement X25519 avec `tweetnacl`

### 2. On-Chain Data Fetching
- Balance Quantum token (Mint: 4KsZXRH3Xjd7z4CiuwgfNQstC2aHDLdJHv5u3tDixtLc)
- Balance SOL
- Conversion USD/EUR en temps réel

### 3. MLM Affiliate System (5 Levels) ✅ IMPLEMENTED
| Level | Commission Rate |
|-------|----------------|
| 1     | 20%            |
| 2     | 10%            |
| 3     | 5%             |
| 4     | 2.5%           |
| 5     | 1%             |
| **Total** | **38.5%**  |

**Backend Features:**
- User registration with unique referral codes
- Automatic affiliate relation creation up to 5 levels
- Commission tracking per event (pending/confirmed/paid)
- Stats aggregation per level
- Commission history with pagination

**Frontend Features:**
- Professional MLM dashboard
- Referral code display with copy/share
- Stats breakdown per level (referrals, commissions)
- Commission rate information card
- Recent commissions list (expandable)

### 4. UI/UX
- Landing page avec "Access Platform"
- Portfolio avec état connecté/déconnecté
- Profile avec paramètres utilisateur
- Opportunities avec filtres et votes
- Pre-Sale form avec validation
- **Referral dashboard MLM professionnel**

## Technical Architecture
- **Frontend**: React Native + Expo Router
- **Backend**: FastAPI + MongoDB
- **Blockchain**: Solana Mainnet-Beta (JSON-RPC direct)
- **Wallet**: Phantom via Universal Links
- **Crypto**: tweetnacl (lazy-loaded), bs58

## Key Files
- `/app/frontend/contexts/WalletContext.tsx` - Logique wallet
- `/app/frontend/utils/solanaRpc.ts` - Appels RPC Solana
- `/app/frontend/app/(tabs)/portfolio.tsx` - Page Portfolio
- `/app/frontend/app/(tabs)/profile.tsx` - Page Profile
- `/app/frontend/app/(tabs)/affiliation.tsx` - Dashboard MLM
- `/app/backend/server.py` - API backend avec système MLM

## API Endpoints

### MLM Affiliate Endpoints
- `POST /api/affiliate/register` - Enregistrer utilisateur avec code parrain optionnel
- `GET /api/affiliate/{wallet}/stats` - Stats complètes par niveau (5 niveaux)
- `GET /api/affiliate/{wallet}/commissions` - Historique des commissions
- `GET /api/affiliate/{wallet}/tree` - Arbre d'affiliation (downline)
- `POST /api/affiliate/commission/distribute` - Distribuer commissions (interne)
- `GET /api/affiliate/config` - Configuration des taux de commission

### MongoDB Collections
- `users` - Utilisateurs avec referral_code et referrer_id
- `affiliate_relations` - Relations niveau 1-5 entre users
- `affiliate_commissions` - Log de toutes les commissions

## What's Implemented ✅
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
- [x] **Système MLM 5 niveaux complet (backend + frontend)**
- [x] **Dashboard affiliation professionnel**
- [x] **Distribution automatique des commissions**

## Mocked/Hardcoded
- **QUANTUM_PRICE_USD = $2.50** (pré-TGE, hardcodé dans solanaRpc.ts)

## Backlog

### P0 - À Vérifier
- [ ] Vérifier affichage balance Quantum token (user mentionne problème)
- [ ] Corriger l'adresse du mint si nécessaire

### P1 - Prochaines Tâches
- [ ] Dashboard admin externe pour gestion affiliés
- [ ] Gestion des paiements de commissions
- [ ] Ajustements manuels de commission (admin)

### P2 - Future
- [ ] Redesign barre de navigation inférieure (style "delta")
- [ ] Révision générale UI/UX (page settings)
- [ ] Fix Expo Go preview (CORS issue)
- [ ] Arbre visuel d'affiliation (tree view)

## Testing Status
- Backend MLM: 100% pass (15/15 tests - iteration_2.json)
- Frontend MLM: 100% pass (UI verified)
- Wallet flow: Testé via logs console

## Last Updated
2026-02-11 - Système MLM multi-niveau implémenté et testé
