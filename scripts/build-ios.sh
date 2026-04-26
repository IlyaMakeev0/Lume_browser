#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -d "$ROOT/src-tauri/gen/apple" ]; then
  npm run tauri -- ios init
fi

mkdir -p "$ROOT/apps/ios/installers"
npm run build
npm run tauri -- ios build

find "$ROOT/src-tauri/gen/apple" \
  -type f \( -name "*.ipa" -o -name "*.xcarchive" \) \
  -exec cp -R {} "$ROOT/apps/ios/installers/" \;

echo "iOS artifacts copied to $ROOT/apps/ios/installers"
