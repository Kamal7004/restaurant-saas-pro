#!/bin/bash
set -e

# Configuration
PROJECT_ROOT=$(pwd)
RELEASE_DIR="$PROJECT_ROOT/release"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "🚀 Starting bundle process..."

# 1. Clean previous release
echo "🧹 Cleaning previous release directory..."
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR/backend"
mkdir -p "$RELEASE_DIR/frontend/build"

# 2. Build Frontend
echo "⚛️ Building Frontend..."
cd "$FRONTEND_DIR"
npm install --legacy-peer-deps
npm run build
cp -r build/* "$RELEASE_DIR/frontend/build/"

# 3. Build Backend
echo "⚙️ Building Backend..."
cd "$BACKEND_DIR"
npm install
npm run build
cp -r dist "$RELEASE_DIR/backend/"
cp package.json "$RELEASE_DIR/backend/"
cp package-lock.json "$RELEASE_DIR/backend/" 2>/dev/null || :
cp .env.example "$RELEASE_DIR/backend/"

# 4. Finalize
echo "✅ Bundle complete!"
echo "📂 Release directory: $RELEASE_DIR"
echo "📝 To run the release:"
echo "   1. cd release/backend"
echo "   2. npm install --production"
echo "   3. Set FRONTEND_DIR=../frontend/build in your .env"
echo "   4. node dist/index.js"
