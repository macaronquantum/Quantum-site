

echo "Starting application..."

# Installer les dépendances frontend
cd frontend
npm install
npm run build

# Lancer le backend
cd ../backend
