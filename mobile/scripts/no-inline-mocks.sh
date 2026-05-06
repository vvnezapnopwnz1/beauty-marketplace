#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGETS=("$ROOT_DIR/app" "$ROOT_DIR/src")

PATTERN='const[[:space:]]+(MOCK|MOCKS|DATA|CLIENTS)[[:space:]]*[:=]'

echo "Scanning mobile app for inline mock constants..."

if command -v rg >/dev/null 2>&1; then
  if rg --line-number --glob '!**/*.test.*' --glob '!**/__tests__/**' "$PATTERN" "${TARGETS[@]}"; then
    echo ""
    echo "Found inline mock-style constants. Move data to API/entity layer or fixtures."
    exit 1
  fi
else
  if grep -REn --exclude='*.test.*' --exclude-dir='__tests__' "$PATTERN" "${TARGETS[@]}"; then
    echo ""
    echo "Found inline mock-style constants. Move data to API/entity layer or fixtures."
    exit 1
  fi
fi

echo "No inline mock constants found."
