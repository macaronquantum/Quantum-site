#!/bin/sh

echo "===== STARTING APPLICATION ====="

# 1️⃣ Installer backend
echo "Installing backend dependencies..."
cd backend
if [ -f package.json ]; then
  npm install
fi
cd ..

# 2️⃣ Installer frontend et build
echo "Installing frontend dependencies..."
cd frontend
npm install
echo "Building frontend..."
npm run build
cd ..

# 3️⃣ Démarrer backend
echo "Starting backend..."
cd backend
if [ -f package.json ]; then
  npm start
elif [ -f app.py ]; then
  python3 app.py
else
  echo "No start command found for backend"
fi
