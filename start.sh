#!/bin/sh

echo "===== STARTING APPLICATION ====="

# Backend
cd backend
if [ -f package.json ]; then
  npm install
fi
cd ..

# Frontend
cd frontend
npm install
npm run build
cd ..

# Start backend
cd backend
if [ -f package.json ]; then
  npm start
elif [ -f serveur.py ]; then
  python3 serveur.py
else
  echo "No start command found for backend"
fi
