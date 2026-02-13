# Quantum IA - Web Application PRD

## Original Problem Statement
Transform the existing Quantum IA React Native/Expo mobile app into a responsive React web application. Same backend, features, logic, design.

## Architecture
- **Frontend:** React 19 + Vite 7 + Tailwind CSS v4
- **Backend:** FastAPI (Python) - unchanged
- **Database:** MongoDB
- **Blockchain:** Solana (Phantom wallet)

## Pages
1. Landing (hero, value props, presale progress, whitepaper, CTA)
2. Presale (purchase, progress, referrals)
3. Portfolio (balances QTM/SOL/USD/EUR)
4. Affiliation (MLM 5-level, commissions)
5. Opportunities (AI investments, voting)
6. Profile (settings, notifications)
7. Connect Callback `/connect/:sid` (Phantom deep-link)

## Wallet Flow
- Desktop + extension: direct popup
- Desktop no extension: modal (deep-link + install)
- Mobile: auto deep-link → Phantom app → callback

## Implemented (Feb 12-13, 2026)
- Full web app, all pages, responsive
- Wallet: extension + deep-link (mobile & desktop)
- SOL price: CoinGecko + Binance fallback
- Custom logo (all instances)
- Lazy loading (React.lazy)
- Vite build: terser, manual chunks, preconnect
- Whitepaper download button
- Toggle CSS fix (flexbox)
- Build: ~130KB gzipped

## Testing
- Iter 8: Wallet deep-link 100%
- Iter 9: Bug fixes 100%
- Iter 10: Logo + perf 100%

## Backlog
- P1: Admin dashboard
- P2: Swap page, transaction history
- P3: Analytics, SEO meta tags
