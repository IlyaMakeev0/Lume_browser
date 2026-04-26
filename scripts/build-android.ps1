param(
  [switch] $InitIfMissing
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  throw "Cargo is not installed or not available in PATH. Install Rust with rustup before building Android artifacts."
}

if ($InitIfMissing -and -not (Test-Path -LiteralPath (Join-Path $repoRoot "src-tauri\gen\android"))) {
  npm run tauri -- android init
}

$artifactDir = Join-Path $repoRoot "apps\android\installers"
New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null

npm run build
npm run tauri -- android build

$androidRoot = Join-Path $repoRoot "src-tauri\gen\android\app\build\outputs"
if (-not (Test-Path -LiteralPath $androidRoot)) {
  throw "Android build output was not found: $androidRoot"
}

Get-ChildItem -LiteralPath $androidRoot -Recurse -File -Include *.apk,*.aab |
  Copy-Item -Destination $artifactDir -Force

Write-Output "Android APK/AAB artifacts copied to $artifactDir"
