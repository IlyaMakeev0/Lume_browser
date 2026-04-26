# Packaging

This project is prepared to place produced installers inside the platform app folders.

## Windows

Targets:

- `x86_64-pc-windows-msvc` -> `apps/windows/installers/x86_64`
- `aarch64-pc-windows-msvc` -> `apps/windows/installers/arm64`

Commands:

```powershell
npm run build:windows:x64
npm run build:windows:arm64
```

Expected installer formats: `.exe` and `.msi`.

Updater signatures are generated when `TAURI_SIGNING_PRIVATE_KEY_PATH` or
`TAURI_SIGNING_PRIVATE_KEY` is available. The local default key path is
`%USERPROFILE%\.tauri\lume-updater.key`; do not commit that private key.

For GitHub Releases, upload the installer, matching `.sig` files, and a
`latest.json` endpoint at:

```text
https://github.com/IlyaMakeev0/Lume_browser/releases/latest/download/latest.json
```

GitHub Actions should define these repository secrets before release builds:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` if the key has a password

## Android

Command:

```powershell
npm run build:android
```

Expected artifact formats: `.apk` and `.aab` in `apps/android/installers`.

## macOS

Deferred until a macOS build host is available.

Targets:

- `x86_64-apple-darwin` -> `apps/macos/installers/intel`
- `aarch64-apple-darwin` -> `apps/macos/installers/apple-silicon`

Commands on macOS:

```bash
npm run build:macos:intel
npm run build:macos:apple
```

Expected installer format: `.dmg`.

## iOS

Deferred until macOS and Xcode signing are available.

Command on macOS:

```bash
npm run build:ios
```

Expected artifact format: `.ipa`.

## CI

GitHub Actions workflows are included for Windows and Android:

- `.github/workflows/build-windows.yml`
- `.github/workflows/build-android.yml`
