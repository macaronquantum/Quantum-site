# Quantum IA - Web Application

## Product Requirements

### Original Problem Statement
Transform the existing Quantum IA React Native/Expo mobile app into a fully responsive web application while keeping 100% of existing features, logic, and integrations. Same backend, same data, same blockchain interactions.

### Architecture
- **Frontend:** React + Vite + Tailwind CSS v4
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Blockchain:** Solana (Phantom wallet)
- **Payments:** Card2Crypto (USDC on Polygon)

### Tech Stack
- React 19 + React Router v7
- Vite 7, Tailwind CSS v4
- Axios, Lucide React, tweetnacl, bs58, buffer

### Pages
1. Landing Page - Hero, value props, presale progress, whitepaper, CTA
2. Presale - Purchase form, real-time progress, referral codes
3. Portfolio - Wallet balances (QTM, SOL), USD/EUR
4. Affiliation - MLM 5-level, commissions
5. Opportunities - AI investment with voting
6. Profile - Settings, notifications, wallet
7. Connect Callback `/connect/:sid` - Phantom deep-link return

### Wallet Connection Flow
- **Desktop (extension):** Detect Phantom → popup → connected
- **Desktop (no extension):** Modal: "Ouvrir l'app Phantom" (deep-link) + "Installer l'extension"
- **Mobile:** Auto deep-link → Phantom app → callback → connected

### API Endpoints
- Presale: GET /api/presale/progress, POST /api/presale/purchase, GET /api/presale/status/{id}
- Wallet sessions: POST /api/wallet/session, GET /api/wallet/session/{id}
- Affiliate: GET/POST affiliate endpoints
- Solana: GET /api/solana/balance/{wallet}
- Notifications: GET/POST/DELETE endpoints

## What's Been Implemented

### Feb 12, 2026
- Full React + Vite web app, all 6 pages
- Responsive design, hamburger menu
- Desktop wallet extension detection
- Presale, affiliation, portfolio features
- Deployment configs (Vercel, Netlify, Nginx)

### Feb 13, 2026
- Mobile wallet deep-link (Phantom app)
- ConnectCallback page `/connect/:sid`
- Dual-option modal (desktop)
- SOL price Binance fallback (CoinGecko rate-limited)
- Toggle CSS fix (flexbox)
- Whitepaper download button on Landing

### Testing
- Iteration 8: Backend 100% (10/10), Frontend 100% - Wallet deep-link
- Iteration 9: Backend 100% (7/7), Frontend 100% - Bug fixes

## Backlog
- P1: Full e2e on production
- P1: Admin dashboard
- P2: Swap page, Transaction history
- P3: Analytics, SEO
