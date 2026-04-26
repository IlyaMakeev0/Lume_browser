#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-aarch64-apple-darwin}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

case "$TARGET" in
  x86_64-apple-darwin) OUT_DIR="$ROOT/apps/macos/installers/intel" ;;
  aarch64-apple-darwin) OUT_DIR="$ROOT/apps/macos/installers/apple-silicon" ;;
  *) echo "Unsupported macOS target: $TARGET" >&2; exit 1 ;;
esac

cd "$ROOT"
mkdir -p "$OUT_DIR"

rustup target add "$TARGET"
npm run build
npm run tauri -- build --target "$TARGET"

BUNDLE_ROOT=""
for candidate in \
  "$ROOT/src-tauri/target/$TARGET/release/bundle" \
  "$ROOT/target/$TARGET/release/bundle" \
  "$ROOT/src-tauri/target/release/bundle" \
  "$ROOT/target/release/bundle"; do
  if [ -d "$candidate" ]; then
    BUNDLE_ROOT="$candidate"
    break
  fi
done

if [ -z "$BUNDLE_ROOT" ]; then
  echo "Tauri bundle output was not found" >&2
  exit 1
fi

find "$BUNDLE_ROOT" \
  -type f \( -name "*.dmg" -o -name "*.app.tar.gz" \) \
  -exec cp -R {} "$OUT_DIR/" \;

echo "macOS artifacts copied to $OUT_DIR"
