#!/bin/sh

echo "===== STARTING APPLICATION ====="

echo "Installing backend dependencies..."
cd backend
npm install || echo "No npm backend dependencies"

echo "Installing frontend dependencies..."
cd ../frontend
npm install

echo "Building frontend..."
npm run build

echo "Starting backend..."
cd ../backend
npm start  # ou python app.py selon ton backend
