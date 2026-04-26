param(
  [ValidateSet("x86_64-pc-windows-msvc", "aarch64-pc-windows-msvc")]
  [string] $Target = "x86_64-pc-windows-msvc",
  [switch] $SkipFrontendBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
if (Test-Path -LiteralPath $cargoBin) {
  $env:PATH = "$cargoBin;$env:PATH"
}

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  throw "Cargo is not installed or not available in PATH. Install Rust with rustup before building Windows installers."
}

if (Get-Command rustup -ErrorAction SilentlyContinue) {
  rustup target add $Target
}

$archName = if ($Target -eq "aarch64-pc-windows-msvc") { "arm64" } else { "x86_64" }
$vsArch = if ($Target -eq "aarch64-pc-windows-msvc") { "arm64" } else { "x64" }
$artifactDir = Join-Path $repoRoot "apps\windows\installers\$archName"
New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null

if (-not $SkipFrontendBuild) {
  npm run build
}

$vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
$vsPath = if (Test-Path -LiteralPath $vswhere) {
  & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
}

if (-not $vsPath) {
  throw "Visual Studio C++ tools were not found. Install Desktop development with C++ in Visual Studio Installer."
}

$devCmd = Join-Path $vsPath "Common7\Tools\VsDevCmd.bat"
if (-not (Test-Path -LiteralPath $devCmd)) {
  throw "VsDevCmd.bat was not found: $devCmd"
}

$extraConfigArg = ""
if ($SkipFrontendBuild) {
  $skipConfig = Join-Path $env:TEMP "lume-tauri-skip-frontend.json"
  @'
{
  "build": {
    "beforeBuildCommand": null
  }
}
'@ | Set-Content -LiteralPath $skipConfig -Encoding UTF8
  $extraConfigArg = "--config `"$skipConfig`""
}

$command = "`"$devCmd`" -arch=$vsArch -host_arch=x64 && set PATH=%USERPROFILE%\.cargo\bin;%PATH% && npm run tauri -- build --target $Target --bundles nsis,msi $extraConfigArg --ci"
cmd /c $command
if ($LASTEXITCODE -ne 0) {
  throw "Tauri Windows build failed with exit code $LASTEXITCODE."
}

$candidateBundleRoots = @(
  (Join-Path $repoRoot "src-tauri\target\$Target\release\bundle"),
  (Join-Path $repoRoot "target\$Target\release\bundle"),
  (Join-Path $repoRoot "src-tauri\target\release\bundle"),
  (Join-Path $repoRoot "target\release\bundle")
)

$bundleRoot = $candidateBundleRoots | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $bundleRoot) {
  throw "Tauri bundle output was not found in: $($candidateBundleRoots -join ', ')"
}

Get-ChildItem -LiteralPath $bundleRoot -Recurse -File -Include *.exe,*.msi |
  Copy-Item -Destination $artifactDir -Force

Write-Output "Windows $archName installers copied to $artifactDir"
