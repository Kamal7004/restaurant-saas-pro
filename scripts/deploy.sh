#!/bin/bash

# Arguments
GITHUB_TOKEN=$1
DEPLOY_DIR=$2
TAG=$3

if [ -z "$GITHUB_TOKEN" ] || [ -z "$DEPLOY_DIR" ]; then
  echo "Usage: ./deploy.sh <GITHUB_TOKEN> <DEPLOY_DIR> [RELEASE_TAG]"
  exit 1
fi

# Configuration
REPO="Kamal7004/restaurant-saas-pro"
CLIENT_DIR="$DEPLOY_DIR/frontend"
SERVER_DIR="$DEPLOY_DIR/backend"
DOWNLOAD_DIR="$DEPLOY_DIR/download"

if [ -z "$TAG" ]; then
  echo "⚠️ No tag provided. Fetching latest release..."
  API_URL="https://api.github.com/repos/$REPO/releases/latest"
else
  echo "🚀 Starting deployment for tag: $TAG"
  # Support both "v2" and "tags/v2" formats
  if [[ "$TAG" == v* ]]; then
    API_URL="https://api.github.com/repos/$REPO/releases/tags/$TAG"
  else
    API_URL="https://api.github.com/repos/$REPO/releases/tags/$TAG"
  fi
fi

# Function to fetch download URL using Node.js for JSON parsing
get_asset_url() {
  local asset_name=$1
  curl -s -H "Authorization: token $GITHUB_TOKEN" "$API_URL" | \
  node -e "
    const fs = require('fs');
    const stdin = fs.readFileSync(0, 'utf-8');
    try {
      const release = JSON.parse(stdin);
      const asset = release.assets.find(a => a.name === '$asset_name');
      if (asset) console.log(asset.url);
    } catch (e) {
      // ignore
    }
  "
}

# Create directories if they don't exist
mkdir -p "$CLIENT_DIR"
mkdir -p "$SERVER_DIR"
mkdir -p "$DOWNLOAD_DIR"

# Get Download URLs
echo "🔍 Fetching release info..."
CLIENT_ASSET_URL=$(get_asset_url "restaurant-saas-ui.zip")
SERVER_ASSET_URL=$(get_asset_url "restaurant-saas-be.zip")

if [ -z "$CLIENT_ASSET_URL" ] || [ -z "$SERVER_ASSET_URL" ]; then
  echo "❌ Error: Could not find artifacts 'restaurant-saas-ui.zip' or 'restaurant-saas-be.zip' in the release."
  echo "DEBUG: API_URL=$API_URL"
  exit 1
fi

# Download artifacts
echo "⬇️ Downloading ui and server artifacts..."
echo "  - UI Asset URL: $CLIENT_ASSET_URL"
curl -L -H "Authorization: token $GITHUB_TOKEN" -H "Accept: application/octet-stream" -o "$DOWNLOAD_DIR/restaurant-saas-ui.zip" "$CLIENT_ASSET_URL"

echo "  - Server Asset URL: $SERVER_ASSET_URL"
curl -L -H "Authorization: token $GITHUB_TOKEN" -H "Accept: application/octet-stream" -o "$DOWNLOAD_DIR/restaurant-saas-be.zip" "$SERVER_ASSET_URL"


# Deploy UI
echo "📦 Deploying UI..."
if [ -d "$CLIENT_DIR/build" ]; then
  echo "  - Backing up current ui..."
  rm -rf "${CLIENT_DIR}_backup"
  mv "$CLIENT_DIR/build" "${CLIENT_DIR}_backup"
fi

mkdir -p "$CLIENT_DIR/build"
if unzip -o "$DOWNLOAD_DIR/restaurant-saas-ui.zip" -d "$CLIENT_DIR/build"; then
  echo "✅ UI deployed successfully."
  if [ -d "${CLIENT_DIR}_backup" ]; then
    echo "  - Removing backup..."
    rm -rf "${CLIENT_DIR}_backup"
  fi
  rm "$DOWNLOAD_DIR/restaurant-saas-ui.zip"
else
  echo "❌ UI deployment failed! Restoring backup..."
  rm -rf "$CLIENT_DIR/build"
  if [ -d "${CLIENT_DIR}_backup" ]; then
    mv "${CLIENT_DIR}_backup" "$CLIENT_DIR/build"
  fi
  exit 1
fi

# Deploy Server
echo "📦 Deploying Server..."
if [ -d "$SERVER_DIR" ] && [ -f "$SERVER_DIR/package.json" ]; then
  echo "  - Backing up current server..."
  rm -rf "${SERVER_DIR}_backup"
  mv "$SERVER_DIR" "${SERVER_DIR}_backup"
  mkdir -p "$SERVER_DIR" # Recreate the dir for unzip
fi

if unzip -o "$DOWNLOAD_DIR/restaurant-saas-be.zip" -d "$SERVER_DIR"; then
  echo "✅ Server deployed successfully."
  rm "$DOWNLOAD_DIR/restaurant-saas-be.zip"
else
  echo "❌ Server deployment failed! Restoring backup..."
  rm -rf "$SERVER_DIR"
  if [ -d "${SERVER_DIR}_backup" ]; then
    mv "${SERVER_DIR}_backup" "$SERVER_DIR"
  fi
  exit 1
fi

# Install Server Dependencies
echo "🔧 Installing Server Dependencies..."
if [ -d "$SERVER_DIR" ] && [ -f "$SERVER_DIR/package.json" ]; then
  cd "$SERVER_DIR"
  if npm install --omit=dev; then
    echo "✅ Dependencies installed."
  else
    echo "❌ dependency installation failed! Restoring backup..."
    cd "$DEPLOY_DIR"
    rm -rf "$SERVER_DIR"
    if [ -d "${SERVER_DIR}_backup" ]; then
      mv "${SERVER_DIR}_backup" "$SERVER_DIR"
      echo "✅ Restored previous server version."
    fi
    exit 1
  fi
else
  echo "❌ Error: Server directory or package.json not found!"
  cd "$DEPLOY_DIR"
  if [ -d "${SERVER_DIR}_backup" ]; then
    rm -rf "$SERVER_DIR"
    mv "${SERVER_DIR}_backup" "$SERVER_DIR"
    echo "✅ Restored previous server version."
  fi
  exit 1
fi

# Start Server
echo "🚀 Starting Server..."
if [ -f "$DEPLOY_DIR/.env" ]; then
    echo "📄 Copying .env file..."
    cp "$DEPLOY_DIR/.env" "$SERVER_DIR/.env"
else
    echo "❌ Error: .env file not found in $DEPLOY_DIR"
    cd "$DEPLOY_DIR"
    rm -rf "$SERVER_DIR"
    if [ -d "${SERVER_DIR}_backup" ]; then
      mv "${SERVER_DIR}_backup" "$SERVER_DIR"
      echo "✅ Restored previous server version."
    fi
    exit 1
fi

# Remove old backend backup on completely successful run
if [ -d "$DEPLOY_DIR/${SERVER_DIR}_backup" ]; then
  echo "  - Removing backend backup..."
  rm -rf "$DEPLOY_DIR/${SERVER_DIR}_backup"
fi

# Restart service
if systemctl is-active --quiet restaurant-saas.service; then
  echo "🔔 Restarting restaurant-saas.service..."
  systemctl restart restaurant-saas.service
else
  echo "⚠️ restaurant-saas.service is not active or not found. Skipping restart."
fi

echo "✅ Deployment Complete!"
