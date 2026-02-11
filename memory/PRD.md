# Quantum DAO - Product Requirements Document

## Original Problem Statement
Application Expo/React Native pour Quantum DAO avec systeme MLM 5 niveaux, presale, notifications.

## Technical Architecture
- **Frontend**: React Native + Expo Router (Web)
- **Backend**: FastAPI + MongoDB
- **Blockchain**: Solana Mainnet-Beta (via backend proxy)

## What's Implemented
- [x] Wallet Phantom connection (web + mobile)
- [x] Balance Quantum on-chain via backend proxy (9,924,000 QTM verified)
- [x] Balance SOL + conversion USD/EUR
- [x] MLM 5 niveaux (L1=20%, L2=10%, L3=5%, L4=2.5%, L5=1% = 38.5%)
- [x] Dashboard affiliation avec detail par niveau (cliquable)
- [x] Distribution automatique des commissions
- [x] Notifications in-app (auto on commission)
- [x] Copy buttons cross-platform (navigator.clipboard web + expo-clipboard native)
- [x] Cross-platform alerts (window.alert web + Alert.alert native)
- [x] Presale progress bar ($2M goal, on-chain data + manual fallback)
- [x] Presale participants = real token holders (4 via manual config)
- [x] SOL price from CoinGecko
- [x] CTA marketing banner
- [x] Lien Solscan discret sur page d'accueil
- [x] Prix Quantum = $0.20 (pre-TGE)
- [x] Backend proxy Solana balance (avoid CORS)

## Key Configuration
- QUANTUM_PRICE_USD = $0.20
- QUANTUM_MINT = 4KsZXRH3Xjd7z4CiuwgfNQstC2aHDLdJHv5u3tDixtLc
- WALLET = 2ebxzttJ5zyLme4cBBHD8hKkVho4tJ13tUUWu3B3aG5i
- Presale Goal = $2,000,000
- SOL received tracking (on-chain with rate-limit handling)
- Presale cache TTL = 30 min

## Key Files
- `/app/frontend/utils/solanaRpc.ts` - RPC + backend proxy + SOLSCAN_TOKEN_URL
- `/app/frontend/utils/platform.ts` - Cross-platform alert/clipboard
- `/app/frontend/contexts/WalletContext.tsx` - Wallet + balance (backend proxy first)
- `/app/frontend/app/index.tsx` - Landing page with Solscan link
- `/app/frontend/app/(tabs)/portfolio.tsx` - Portfolio ($0.20 price)
- `/app/frontend/app/(tabs)/affiliation.tsx` - MLM Dashboard
- `/app/frontend/app/(tabs)/profile.tsx` - Profile + Notifications
- `/app/frontend/app/(tabs)/presale.tsx` - Presale form
- `/app/backend/server.py` - All backend APIs

## API Endpoints
- `GET /api/solana/balance/{wallet}` - SOL + QTM balance proxy
- `GET /api/presale/progress` - On-chain presale stats (cached 30min)
- `PUT /api/presale/config` - Manual presale override (admin)
- `POST /api/affiliate/register` - Register with referral
- `GET /api/affiliate/{wallet}/stats` - MLM stats per level
- `GET /api/affiliate/{wallet}/level/{level}/transactions` - Level transactions
- `POST /api/affiliate/commission/distribute` - Distribute commissions
- `GET /api/notifications/{wallet}` - User notifications

## Backlog
### P1
- [ ] Dashboard admin
- [ ] Expo Push Notifications natives
### P2
- [ ] Arbre visuel d'affiliation
- [ ] Refactoring server.py en modules
- [ ] Paid RPC endpoint (Helius/QuickNode) for reliable on-chain data

## Testing: 39/39 backend tests PASS (iteration_5.json)
## Last Updated: 2026-02-11
