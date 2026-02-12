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

### Pages
1. **Landing Page** - Marketing-first with hero, value props, trust section, presale progress, CTA
2. **Presale** - Purchase form (Card/Crypto), real-time progress, referral code support
3. **Portfolio** - Wallet balances (QTM, SOL), USD/EUR values, on-chain info
4. **Affiliation** - MLM 5-level system, referral codes, commission tracking
5. **Opportunities** - AI investment opportunities with voting
6. **Profile** - Settings, notifications, wallet management

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

## What's Been Implemented (Feb 12, 2026)

### Completed
- Full React + Vite web app replacing Expo mobile app
- All 6 pages with full feature parity
- Responsive design (mobile 375px, tablet 768px, desktop 1920px)
- Hamburger menu for mobile navigation
- Phantom wallet integration for web (browser extension)
- Real-time presale progress from backend API
- Card2Crypto payment flow (card + crypto)
- MLM 5-level affiliation system with commission tracking
- Referral code support via URL params (?ref=CODE)
- Production build ready (yarn build -> dist/)
- Deployment configs: vercel.json, _redirects (Netlify), nginx.conf
- Dark theme with violet accent matching mobile app design

### Testing Results
- Iteration 6: 100% frontend pass (11/11 features)
- Iteration 7: 100% frontend pass (14/14 features)
- All API endpoints verified working
- Responsive layout verified on 3 breakpoints

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
- P1: Admin dashboard (compatible with same backend)
- P2: Swap functionality page
- P2: Transaction history page
- P3: Analytics integration
- P3: SEO optimization (meta tags per page)
