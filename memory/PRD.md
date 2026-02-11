# Quantum DAO - Product Requirements Document

## Original Problem Statement
Application Expo/React Native pour Quantum DAO avec:
- Connexion wallet Solana (Phantom) fonctionnelle de bout en bout
- Récupération des données on-chain (balance Quantum token, SOL, conversion USD/EUR)
- Affichage des données sur les pages Portfolio, Profile après connexion
- Prix Quantum token hardcodé à $2.50 USD (pré-TGE)
- **Système d'affiliation multi-niveau (MLM) à 5 niveaux PROFESSIONNEL**
- **Barre de progression presale avec objectif $2M**
- **Système de notifications pour commissions**

## Target Users
- Investisseurs crypto intéressés par le DAO Quantum
- Utilisateurs de wallets Solana (principalement Phantom)
- Affiliés souhaitant monétiser leur réseau MLM

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
- User registration with unique referral codes (QTMXXXXX format)
- Automatic affiliate relation creation up to 5 levels
- Commission tracking per event (pending/confirmed/paid)
- Stats aggregation per level
- Commission history with pagination
- **NEW: Level transaction details (click to expand)**
- **NEW: Notifications on commission received**

**Frontend Features:**
- Professional MLM dashboard
- Referral code display with copy/share (FIXED copy buttons)
- Stats breakdown per level (referrals, commissions)
- **NEW: Click on level → see detailed transactions (modal)**
- Commission rate information card
- Recent commissions list (expandable)

### 4. Presale Progress ✅ IMPLEMENTED
- **Goal: $2,000,000 USD**
- Progress bar with percentage
- Total raised amount (manual backend entry)
- Participants count
- Remaining amount display
- **Referral code input in form**
- **URL parameter support: ?ref=CODE**

### 5. Notification System ✅ IMPLEMENTED
- Auto-notification when commission received
- In-app notification list (expand/collapse)
- Mark as read functionality
- Clear all notifications
- Badge with unread count
- Push notification toggle (ready for Expo Push API)

### 6. UI/UX
- Landing page avec "Access Platform"
- Portfolio avec état connecté/déconnecté
- Profile avec paramètres utilisateur et notifications
- Opportunities avec filtres et votes
- Pre-Sale form avec validation et barre de progression
- Referral dashboard MLM professionnel

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
- `/app/frontend/app/(tabs)/profile.tsx` - Page Profile + Notifications
- `/app/frontend/app/(tabs)/affiliation.tsx` - Dashboard MLM + Level Details
- `/app/frontend/app/(tabs)/presale.tsx` - Presale + Progress Bar
- `/app/backend/server.py` - API backend complète

## API Endpoints

### MLM Affiliate Endpoints
- `POST /api/affiliate/register` - Enregistrer utilisateur avec code parrain
- `GET /api/affiliate/{wallet}/stats` - Stats complètes par niveau
- `GET /api/affiliate/{wallet}/commissions` - Historique des commissions
- `GET /api/affiliate/{wallet}/tree` - Arbre d'affiliation
- `GET /api/affiliate/{wallet}/level/{level}/transactions` - **NEW: Transactions par niveau**
- `POST /api/affiliate/commission/distribute` - Distribuer commissions
- `GET /api/affiliate/config` - Configuration des taux

### Notification Endpoints
- `GET /api/notifications/{wallet}` - Liste des notifications
- `POST /api/notifications/{wallet}/mark-read` - Marquer comme lu
- `DELETE /api/notifications/{wallet}/clear` - Effacer tout
- `POST /api/notifications/register-push-token` - Enregistrer token push

### Presale Endpoints
- `GET /api/presale/progress` - Progression presale (public)
- `PUT /api/presale/config` - Modifier config (admin)
- `POST /api/presale/increment-raised` - Incrémenter total (interne)
- `POST /api/presale/purchase` - Achat presale (avec referral code)

### MongoDB Collections
- `users` - Utilisateurs avec referral_code et referrer_id
- `affiliate_relations` - Relations niveau 1-5 entre users
- `affiliate_commissions` - Log de toutes les commissions
- `notifications` - Notifications utilisateurs
- `push_tokens` - Tokens push Expo
- `presale_config` - Configuration presale (goal, total_raised)

## What's Implemented ✅
- [x] Landing page avec navigation
- [x] Connexion wallet Phantom (web popup + mobile)
- [x] Lazy-loading tweetnacl/bs58
- [x] Récupération balance Quantum on-chain
- [x] Récupération balance SOL
- [x] Conversion USD/EUR temps réel
- [x] Affichage données Portfolio/Profile
- [x] Formulaire Pre-Sale avec validation
- [x] Page Opportunities avec filtres
- [x] Navigation par onglets
- [x] **Système MLM 5 niveaux complet**
- [x] **Dashboard affiliation professionnel**
- [x] **Distribution automatique des commissions**
- [x] **Detail transactions par niveau (modal)**
- [x] **Barre de progression presale ($2M goal)**
- [x] **Input code parrainage dans presale**
- [x] **URL param ?ref=CODE supporté**
- [x] **Système notifications complet**
- [x] **Copy buttons fonctionnels**

## Mocked/Hardcoded
- **QUANTUM_PRICE_USD = $2.50** (pré-TGE, hardcodé)
- **Presale total_raised** (entrée manuelle backend)

## Backlog

### P0 - À Vérifier avec User
- [ ] Vérifier affichage balance Quantum token (user mentionne problème - besoin adresse wallet)

### P1 - Prochaines Tâches
- [ ] Dashboard admin externe pour gestion affiliés/paiements
- [ ] Intégration Expo Push Notifications natives
- [ ] Ajustements manuels de commission (admin)

### P2 - Future
- [ ] Fix Expo Go preview (CORS issue)
- [ ] Arbre visuel d'affiliation (tree view graphique)
- [ ] Redesign barre de navigation inférieure (style "delta")

## Testing Status
- Backend: 100% pass (35/35 tests - iteration_3.json)
- Frontend: 100% pass (all features verified)
- Wallet flow: Testé via logs console

## Last Updated
2026-02-11 - Améliorations MLM: transactions par niveau, notifications, barre progression presale, referral code dans presale
