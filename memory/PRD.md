# Quantum DAO - PRD

## What's Implemented
- [x] Wallet Phantom connection
- [x] Balance Quantum on-chain via backend proxy (9,924,000 QTM)
- [x] Balance SOL + conversion USD/EUR
- [x] Prix Quantum = $0.20 (pre-TGE)
- [x] MLM 5 niveaux (L1=20%, L2=10%, L3=5%, L4=2.5%, L5=1%)
- [x] Dashboard affiliation avec detail par niveau
- [x] Notifications in-app auto
- [x] Copy buttons cross-platform (web + native)
- [x] Cross-platform alerts
- [x] Presale progress = valeur totale wallet on-chain en USD (cache 2h)
- [x] Holders = getTokenLargestAccounts on-chain (fallback MongoDB)
- [x] Lien Solscan sous Holdings sur page Portfolio
- [x] CTA marketing banner
- [x] Backend proxy Solana balance

## Architecture
- Frontend: Expo Router (Web), Backend: FastAPI + MongoDB
- Solana Mainnet via backend RPC proxy (rate-limit safe)
- QUANTUM_MINT = 4KsZXRH3Xjd7z4CiuwgfNQstC2aHDLdJHv5u3tDixtLc
- WALLET = 2ebxzttJ5zyLme4cBBHD8hKkVho4tJ13tUUWu3B3aG5i

## Key Files
- /app/backend/server.py - API + on-chain presale logic
- /app/frontend/utils/solanaRpc.ts - RPC proxy + constants
- /app/frontend/utils/platform.ts - Cross-platform utils
- /app/frontend/contexts/WalletContext.tsx - Wallet + balances
- /app/frontend/app/(tabs)/portfolio.tsx - Portfolio + Solscan link
- /app/frontend/app/(tabs)/presale.tsx - Presale form
- /app/frontend/app/(tabs)/affiliation.tsx - MLM Dashboard
- /app/frontend/app/(tabs)/profile.tsx - Profile + Notifications

## Presale Progress Logic
total_raised = SOL_balance * SOL_price + QTM_balance * $0.20 + USDC + USDT
participants = getTokenLargestAccounts (on-chain, fallback MongoDB)
Cache TTL = 2 hours

## Backlog
- [ ] Dashboard admin (P1)
- [ ] Expo Push Notifications natives (P1)
- [ ] Paid RPC endpoint pour fiabilite (P1)
- [ ] Arbre visuel affiliation (P2)
- [ ] Refactoring server.py (P2)

## Recent Fixes
- [x] Expo Go connection issue resolved (EXPO_PACKAGER_PROXY_URL)
- [x] Wallet connect crash fixed: `Linking.createURL` (react-native) replaced with `createURL` from `expo-linking` in WalletContext.tsx

## Testing: 39/39 backend PASS, frontend verified
## Last Updated: 2026-02-15
