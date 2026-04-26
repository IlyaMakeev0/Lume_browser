# Lume macOS App

This area owns macOS-specific packaging and shell behavior.

## Current Runtime

- Shared shell: `src-tauri`
- Config overlay: `src-tauri/tauri.macos.conf.json`
- Window model: frameless Tauri desktop window with WKWebView.
- Bundle targets: app and dmg for Intel and Apple Silicon.
- Installer output folders:
  - `apps/macos/installers/intel`
  - `apps/macos/installers/apple-silicon`

## Deferred Build

```bash
npm run build:macos:intel
npm run build:macos:apple
```

macOS packaging requires a macOS build host. Signing and notarization still need Apple Developer credentials.

## Next Work

- Add app icon set and dmg background assets.
- Add signing and notarization configuration.
- Validate traffic permissions and window controls on Apple Silicon and Intel.
