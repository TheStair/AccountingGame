#!/bin/bash
set -euo pipefail

# === CONFIG ===
APP_NAME="AccountingGame"
REPO_DIR="/home/$USER/AccountingGame"
WEBROOT="/var/www/$APP_NAME"
BACKUP_DIR="/var/backups/$APP_NAME"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOGFILE="/var/log/deploy_${APP_NAME}.log"
API_LOCATION="/home/$USER/AccountingGame/src/backend"

# === FUNCTIONS ===
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOGFILE"
}

# === START DEPLOYMENT ===
log "Starting deployment of $APP_NAME..."

# 1️⃣ Move into repo directory
cd "$REPO_DIR" || { log "❌ Repo directory not found: $REPO_DIR"; exit 1; }

# 2️⃣ Pull latest updates
log "Pulling latest changes from Git..."
git fetch origin main
git reset --hard origin/main

# 3️⃣ Build the dist (adjust for your frontend build tool)
log "Building frontend distribution..."
npm install
npm run build

# 4️⃣ Backup current webroot
if [ -d "$WEBROOT" ]; then
    log "Backing up current webroot..."
    sudo mkdir -p "$BACKUP_DIR"
    sudo tar -czf "$BACKUP_DIR/${APP_NAME}_backup_${TIMESTAMP}.tar.gz" -C "$WEBROOT" .
    log "Backup saved to $BACKUP_DIR/${APP_NAME}_backup_${TIMESTAMP}.tar.gz"
fi

# 5️⃣ Deploy new dist
DIST_DIR="$REPO_DIR/dist"
if [ ! -d "$DIST_DIR" ]; then
    log "❌ Dist folder not found: $DIST_DIR"
    exit 1
fi

log "Replacing webroot contents..."
sudo rm -rf "${WEBROOT:?}"/*
sudo cp -r "$DIST_DIR"/* "$WEBROOT"/

# 6️⃣ Set correct permissions
log "Setting permissions..."
sudo chown -R www-data:www-data "$WEBROOT"
sudo find "$WEBROOT" -type d -exec chmod 755 {} \;
sudo find "$WEBROOT" -type f -exec chmod 644 {} \;

# 7️⃣ Restart Nginx (optional)
log "Reloading Nginx..."
sudo systemctl reload nginx

log "Deploying API..."
cd "$API_LOCATION" || exit

source venv/bin/activate

nohup uvicorn main:app --reload --host 0.0.0.0 --port 8000 \
  > logs/api.log 2>&1 &

log "✅ Deployment complete!"