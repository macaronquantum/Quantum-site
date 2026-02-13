# Quantum IA - Web Application

## Product Requirements

### Original Problem Statement
Transform the existing Quantum IA React Native/Expo mobile app into a fully responsive web application while keeping 100% of existing features, logic, and integrations. Same backend, same data, same blockchain interactions.

### Architecture
- **Frontend:** React + Vite + Tailwind CSS v4
- **Backend:** FastAPI (Python) - unchanged from mobile app
- **Database:** MongoDB
- **Blockchain:** Solana (Phantom wallet)
- **Payments:** Card2Crypto (USDC on Polygon)

### Tech Stack
- React 19 + React Router v7
- Vite 7 (build tool)
- Tailwind CSS v4 with custom `@theme` tokens
- Axios for API calls
- Lucide React for icons
- tweetnacl + bs58 + buffer (cryptography for Phantom deep-link)

### Pages
1. **Landing Page** - Marketing-first with hero, value props, trust section, presale progress, CTA
2. **Presale** - Purchase form (Card/Crypto), real-time progress, referral code support
3. **Portfolio** - Wallet balances (QTM, SOL), USD/EUR values, on-chain info
4. **Affiliation** - MLM 5-level system, referral codes, commission tracking
5. **Opportunities** - AI investment opportunities with voting
6. **Profile** - Settings, notifications, wallet management
7. **Connect Callback** `/connect/:sid` - Handles Phantom deep-link return

### Design System
- Background: #0A0A0A (dark)
- Surface: #151515
- Primary: #8B5CF6 (violet)
- Premium, clean, crypto-native aesthetic
- Font: Inter

### API Endpoints (Backend - unchanged)
- `GET /api/config` - App configuration
- `GET /api/presale/progress` - Presale progress data
- `POST /api/presale/purchase` - Create Card2Crypto payment
- `GET /api/presale/status/{id}` - Payment status
- `GET /api/affiliate/{wallet}/stats` - Affiliate stats
- `GET /api/affiliate/config` - Commission rates
- `GET /api/affiliate/{wallet}/tree` - Referral tree
- `GET /api/affiliate/{wallet}/level/{level}/transactions` - Level transactions
- `POST /api/affiliate/register` - Register affiliate
- `GET /api/solana/balance/{wallet}` - Wallet balances
- `GET /api/notifications/{wallet}` - Notifications
- `POST /api/notifications/{wallet}/mark-read` - Mark read
- `DELETE /api/notifications/{wallet}/clear` - Clear notifications
- `POST /api/wallet/session` - Create wallet session (for deep-link)
- `GET /api/wallet/session/{id}` - Retrieve wallet session

### Wallet Connection Flow
**Desktop (with extension):**
1. Click "Connecter Wallet" → detects Phantom extension → opens popup → connected

**Desktop (without extension):**
1. Click "Connecter Wallet" → modal with 2 options:
   - "Ouvrir l'app Phantom" → deep-link flow (same as mobile)
   - "Installer l'extension" → link to phantom.app/download

**Mobile (automatic deep-link):**
1. Click "Connecter Wallet" → auto-detects mobile → generates keypair
2. POST keypair to /api/wallet/session → gets session_id
3. Redirect to `phantom.app/ul/v1/connect?...&redirect_link=/connect/{sid}`
4. User approves in Phantom app → redirects back to /connect/{sid}
5. Callback page fetches keypair, decrypts response, extracts wallet address
6. Wallet connected!

## What's Been Implemented

### Feb 12, 2026
- Full React + Vite web app replacing Expo mobile app
- All 6 pages with full feature parity
- Responsive design (mobile 375px, tablet 768px, desktop 1920px)
- Hamburger menu for mobile navigation
- Desktop wallet connection (browser extension detection)
- Real-time presale progress from backend API
- Card2Crypto payment flow (card + crypto)
- MLM 5-level affiliation system with commission tracking
- Referral code support via URL params (?ref=CODE)
- Production build ready (yarn build -> dist/)
- Deployment configs: vercel.json, _redirects (Netlify), nginx.conf

### Feb 13, 2026
- **Mobile wallet deep-link support** - Full Phantom deep-link flow for mobile users
- **ConnectCallback page** `/connect/:sid` - Handles Phantom redirect, decrypts response
- **Dual-option modal** - Desktop users without extension see "Open Phantom App" + "Install Extension"
- **Auto mobile detection** - via navigator.userAgent, auto deep-links on mobile
- **Backend wallet session** - POST/GET endpoints for temporary keypair storage (10min TTL)
- Dependencies added: tweetnacl, bs58, buffer

### Testing Results
- Iteration 8: Backend 100% (10/10), Frontend 100% (all features)
- All API endpoints verified working
- Deep-link flow verified: session creation → Phantom redirect → callback handling
- All data-testid attributes verified

## Deployment Guide

### Quick Deploy (Vercel)
1. `yarn build` -> generates `dist/` folder
2. Push to GitHub
3. Connect repo to Vercel
4. Set env var: `VITE_BACKEND_URL=https://your-backend-domain`
5. Deploy

### VPS/Nginx
1. `yarn build`
2. Copy `dist/` to server
3. Use provided `nginx.conf` template
4. Point domain to server

### Netlify
1. Build command: `yarn build`
2. Publish directory: `dist`
3. `_redirects` file included for SPA routing

## Backlog
- P1: Full e2e test of all features on production
- P1: Admin dashboard (compatible with same backend)
- P2: Swap functionality page
- P2: Transaction history page
- P3: Analytics integration
- P3: SEO optimization (meta tags per page)
