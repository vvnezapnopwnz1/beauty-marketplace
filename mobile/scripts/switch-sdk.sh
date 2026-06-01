#!/bin/bash

# Usage: ./scripts/switch-sdk.sh 54
# Usage: ./scripts/switch-sdk.sh 55

VERSION=$1

if [ "$VERSION" != "54" ] && [ "$VERSION" != "55" ]; then
  echo "❌ Please specify version: 54 or 55"
  exit 1
fi

echo "🔄 Switching to SDK $VERSION..."

# Go to mobile directory if not already there
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.." || exit

if [ ! -f "package.json.$VERSION" ]; then
  echo "❌ Error: package.json.$VERSION not found!"
  exit 1
fi

# Copy package files
cp "package.json.$VERSION" package.json
if [ -f "package-lock.json.$VERSION" ]; then
  cp "package-lock.json.$VERSION" package-lock.json
fi

echo "🚀 Installing dependencies for SDK $VERSION..."
npm install

echo "✨ Done! SDK $VERSION is now active."
echo "💡 IMPORTANT: Run 'npx expo start -c' to clear Metro cache before starting."
