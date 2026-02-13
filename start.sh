#!/bin/sh

echo "===== STARTING APPLICATION ====="

echo "Installing dependencies..."
npm install  # <-- PAS npm ci

echo "Building frontend..."
npm run build

echo "Starting application..."
npm run start
