#!/bin/sh

echo "===== STARTING APPLICATION ====="

echo "Installing dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "Starting application..."
npm run start
