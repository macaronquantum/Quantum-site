# Quantum IA - Web Application PRD

## Original Problem Statement
Transform the existing Quantum IA React Native/Expo mobile app into a responsive React web application. Same backend, features, logic, design.

## Architecture
- **Frontend:** React 19 + Vite 7 + Tailwind CSS v4 (standalone, deployable on Railway/Vercel)
- **Backend:** FastAPI (Python) with uvicorn (standalone, deployable on Railway)
- **Database:** MongoDB (external, e.g. MongoDB Atlas)

## Deployment

### Backend (Railway)
- Detected via `requirements.txt` + `Procfile`
- `Procfile`: `web: uvicorn server:app --host 0.0.0.0 --port $PORT`
- Env vars to set: `MONGO_URL`, `DB_NAME`, `PORT` (auto by Railway)

### Frontend (Railway or Vercel)
- `build`: `vite build` → `dist/`
- `start`: `vite preview --host 0.0.0.0 --port $PORT`
- Env var: `VITE_BACKEND_URL=https://your-backend.railway.app`
- Also deployable on Vercel (vercel.json included) or Netlify (_redirects included)

## Implemented
- Full web app with 7 pages (Landing, Presale, Portfolio, Affiliation, Opportunities, Profile, Connect Callback)
- Wallet: Phantom extension + deep-link (mobile & desktop)
- SOL price: CoinGecko + Binance fallback
- Custom logo, lazy loading, terser build, preconnect
- Build: ~130KB gzipped

## Testing: All iterations passed (1-10)

## Backlog
- P1: Admin dashboard
- P2: Swap page, transaction history
- P3: Analytics, SEO
