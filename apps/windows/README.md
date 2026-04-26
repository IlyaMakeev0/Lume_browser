# Lume Windows App

This area owns Windows-specific packaging and shell behavior.

## Current Runtime

- Shared shell: `src-tauri`
- Config overlay: `src-tauri/tauri.windows.conf.json`
- Window model: frameless Tauri desktop window with WebView2.
- Bundle targets: NSIS and MSI for `x86_64-pc-windows-msvc` and `aarch64-pc-windows-msvc`.
- Installer output folders:
  - `apps/windows/installers/x86_64`
  - `apps/windows/installers/arm64`

## Build

```powershell
npm run build:windows:x64
npm run build:windows:arm64
```

## Next Work

- Add Windows signing config.
- Add installer icon assets.
- Add WebView2 runtime policy for offline builds if needed.
- Validate custom titlebar behavior on Windows 10 and Windows 11.
