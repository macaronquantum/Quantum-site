# Quantum DAO - Product Requirements Document

## Original Problem Statement
Application Expo/React Native pour Quantum DAO avec:
- Connexion wallet Solana (Phantom) fonctionnelle de bout en bout
- Recuperation des donnees on-chain (balance Quantum token, SOL, conversion USD/EUR)
- Affichage des donnees sur les pages Portfolio, Profile apres connexion
- Prix Quantum token hardcode a $2.50 USD (pre-TGE)
- Systeme d'affiliation multi-niveau (MLM) a 5 niveaux PROFESSIONNEL
- Barre de progression presale avec objectif $2M
- Systeme de notifications pour commissions

## Target Users
- Investisseurs crypto interesses par le DAO Quantum
- Utilisateurs de wallets Solana (principalement Phantom)
- Affilies souhaitant monetiser leur reseau MLM

## Core Requirements

### 1. Wallet Connection (Solana Only)
- Support Phantom wallet (extension browser + mobile app)
- Deep-linking pour mobile via `expo-web-browser`
- Popup polling pour web sans extension
- Chiffrement X25519 avec `tweetnacl`

### 2. On-Chain Data Fetching
- Balance Quantum token (Mint: 4KsZXRH3Xjd7z4CiuwgfNQstC2aHDLdJHv5u3tDixtLc)
- Balance SOL
- Conversion USD/EUR en temps reel
- Backend proxy /api/solana/balance/{wallet} pour eviter CORS navigateur

### 3. MLM Affiliate System (5 Levels)
| Level | Commission Rate |
|-------|----------------|
| 1     | 20%            |
| 2     | 10%            |
| 3     | 5%             |
| 4     | 2.5%           |
| 5     | 1%             |
| **Total** | **38.5%**  |

### 4. Presale Progress
- Goal: $2,000,000 USD
- Progress bar with percentage
- Manual backend entry for total_raised

### 5. Notification System
- Auto-notification when commission received
- In-app notification list
- Mark as read / Clear all

## Technical Architecture
- **Frontend**: React Native + Expo Router (Web)
- **Backend**: FastAPI + MongoDB
- **Blockchain**: Solana Mainnet-Beta (via backend proxy)
- **Wallet**: Phantom via Universal Links
- **Crypto**: tweetnacl, bs58

## Key Files
- `/app/frontend/contexts/WalletContext.tsx` - Wallet logic + balance fetching via backend proxy
- `/app/frontend/utils/solanaRpc.ts` - Solana RPC utils + getBalancesViaBackend()
- `/app/frontend/utils/platform.ts` - Cross-platform alert/clipboard utils (web+native)
- `/app/frontend/app/(tabs)/portfolio.tsx` - Portfolio page with CTA banner
- `/app/frontend/app/(tabs)/profile.tsx` - Profile + Notifications
- `/app/frontend/app/(tabs)/affiliation.tsx` - MLM Dashboard
- `/app/frontend/app/(tabs)/presale.tsx` - Presale + Progress Bar
- `/app/backend/server.py` - Backend API

## API Endpoints
- `GET /api/solana/balance/{wallet}` - Solana balance proxy (SOL + QTM)
- `POST /api/affiliate/register` - Register with referral code
- `GET /api/affiliate/{wallet}/stats` - Stats per level
- `GET /api/affiliate/{wallet}/level/{level}/transactions` - Level transactions
- `POST /api/affiliate/commission/distribute` - Distribute commissions
- `GET /api/affiliate/config` - Commission rates
- `GET /api/notifications/{wallet}` - User notifications
- `POST /api/notifications/{wallet}/mark-read` - Mark as read
- `DELETE /api/notifications/{wallet}/clear` - Clear all
- `GET /api/presale/progress` - Presale progress
- `PUT /api/presale/config` - Update presale config (admin)
- `POST /api/presale/purchase` - Purchase tokens

## What's Implemented
- [x] Landing page avec navigation
- [x] Connexion wallet Phantom (web popup + mobile)
- [x] Recuperation balance Quantum on-chain (via backend proxy)
- [x] Recuperation balance SOL
- [x] Conversion USD/EUR temps reel
- [x] Systeme MLM 5 niveaux complet (verified 38.5% distribution)
- [x] Dashboard affiliation professionnel avec detail par niveau
- [x] Distribution automatique des commissions
- [x] Systeme notifications complet
- [x] Copy buttons fonctionnels (cross-platform: web + native)
- [x] Barre de progression presale ($2M goal)
- [x] CTA marketing banner
- [x] Backend proxy Solana balance (avoid CORS)
- [x] Cross-platform alert/clipboard utility (platform.ts)

## Mocked/Hardcoded
- QUANTUM_PRICE_USD = $2.50 (pre-TGE, hardcode)
- Presale total_raised (entree manuelle backend)

## Backlog

### P1 - Prochaines Taches
- [ ] Dashboard admin pour gestion affilies/paiements
- [ ] Integration Expo Push Notifications natives
- [ ] Ajustements manuels de commission (admin)

### P2 - Future
- [ ] Arbre visuel d'affiliation (tree view graphique)
- [ ] Redesign barre de navigation inferieure
- [ ] Refactoring server.py en modules

## Testing Status
- Backend: 100% pass (39/39 tests - iteration_5.json)
- Frontend: 100% pass (all pages verified, bundle builds without errors)
- MLM 5-level chain: Verified with correct rates
- Solana balance proxy: Verified with real mainnet data (9,924,000 QTM)
- Cross-platform copy: Uses navigator.clipboard on web, expo-clipboard on native

## Last Updated
2026-02-11 - Fixed web-specific issues: replaced Alert.alert with cross-platform showAlert, replaced expo-clipboard with navigator.clipboard for web, added platform.ts utility, rebuilt Metro cache
