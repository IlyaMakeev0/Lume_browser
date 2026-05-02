param(
  [ValidateSet("x86_64-pc-windows-msvc", "aarch64-pc-windows-msvc")]
  [string] $Target = "x86_64-pc-windows-msvc",
  [switch] $SkipFrontendBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

function Get-NodePath {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCommand -and $nodeCommand.Source -notlike "*WindowsApps\OpenAI.Codex*") {
    return $nodeCommand.Source
  }

  $bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if (Test-Path -LiteralPath $bundledNode) {
    return $bundledNode
  }

  throw "Node.js was not found. Install Node.js 20+ or make node available in PATH."
}

$nodePath = Get-NodePath
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
  $frontendDist = Join-Path $repoRoot "dist"
  $resolvedRepoRoot = [System.IO.Path]::GetFullPath($repoRoot)
  $resolvedFrontendDist = [System.IO.Path]::GetFullPath($frontendDist)

  if ($resolvedFrontendDist -ne [System.IO.Path]::Combine($resolvedRepoRoot, "dist")) {
    throw "Refusing to clean unexpected frontend output path: $resolvedFrontendDist"
  }

  if (Test-Path -LiteralPath $frontendDist) {
    Remove-Item -LiteralPath $frontendDist -Recurse -Force
  }

  $tempBuildRoot = Join-Path $env:TEMP ("lume-next-build-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $tempBuildRoot | Out-Null

  $frontendItems = @(
    "src",
    "package.json",
    "package-lock.json",
    "next.config.mjs",
    "next-env.d.ts",
    "postcss.config.js",
    "tailwind.config.ts",
    "tsconfig.json",
    "eslint.config.mjs"
  )

  foreach ($item in $frontendItems) {
    $sourcePath = Join-Path $repoRoot $item
    if (Test-Path -LiteralPath $sourcePath) {
      Copy-Item -LiteralPath $sourcePath -Destination $tempBuildRoot -Recurse -Force
    }
  }

  $sourceNodeModules = Join-Path $repoRoot "node_modules"
  $tempNodeModules = Join-Path $tempBuildRoot "node_modules"
  robocopy $sourceNodeModules $tempNodeModules /E /NFL /NDL /NJH /NJS /NP | Out-Null
  if ($LASTEXITCODE -gt 7) {
    throw "Copying node_modules failed with robocopy exit code $LASTEXITCODE."
  }

  Push-Location $tempBuildRoot
  try {
    & $nodePath ".\node_modules\next\dist\bin\next" build --webpack
  } finally {
    Pop-Location
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Frontend build failed with exit code $LASTEXITCODE."
  }

  $builtDist = Join-Path $tempBuildRoot "dist"
  if (-not (Test-Path -LiteralPath (Join-Path $builtDist "index.html"))) {
    throw "Frontend build did not produce dist\index.html."
  }

  New-Item -ItemType Directory -Force -Path $frontendDist | Out-Null
  Copy-Item -Path (Join-Path $builtDist "*") -Destination $frontendDist -Recurse -Force
}

$defaultSigningKey = Join-Path $env:USERPROFILE ".tauri\lume-updater.key"
if (
  -not $env:TAURI_SIGNING_PRIVATE_KEY -and
  (Test-Path -LiteralPath $defaultSigningKey)
) {
  $env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content -Raw -LiteralPath $defaultSigningKey).Trim()
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
$skipConfig = Join-Path $env:TEMP "lume-tauri-skip-frontend.json"
@'
{
  "build": {
    "beforeBuildCommand": null
  }
}
'@ | Set-Content -LiteralPath $skipConfig -Encoding UTF8
$extraConfigArg = "--config `"$skipConfig`""

$tauriCli = Join-Path $repoRoot "node_modules\@tauri-apps\cli\tauri.js"
if (Get-Command npm -ErrorAction SilentlyContinue) {
  $tauriCommand = "npm run tauri -- build --target $Target --bundles nsis,msi $extraConfigArg --ci"
} elseif (Test-Path -LiteralPath $tauriCli) {
  $tauriCommand = "`"$nodePath`" `"$tauriCli`" build --target $Target --bundles nsis,msi $extraConfigArg --ci"
} else {
  throw "Tauri CLI was not found. Run npm install before building installers."
}

$command = "`"$devCmd`" -arch=$vsArch -host_arch=x64 && set PATH=%USERPROFILE%\.cargo\bin;%PATH% && $tauriCommand"
cmd /c $command
if ($LASTEXITCODE -ne 0) {
  throw "Tauri Windows build failed with exit code $LASTEXITCODE."
}

$candidateAppExePaths = @(
  (Join-Path $repoRoot "src-tauri\target\$Target\release\lume.exe"),
  (Join-Path $repoRoot "target\$Target\release\lume.exe")
)

$appExe = $candidateAppExePaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($appExe) {
  $portableDir = Join-Path $repoRoot "target\release"
  New-Item -ItemType Directory -Force -Path $portableDir | Out-Null
  Copy-Item -LiteralPath $appExe -Destination (Join-Path $portableDir "lume_portable_production.exe") -Force

  try {
    Copy-Item -LiteralPath $appExe -Destination (Join-Path $portableDir "lume.exe") -Force
  } catch {
    Write-Warning "Could not replace target\release\lume.exe. Close running Lume processes and rerun this script."
  }
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

Get-ChildItem -LiteralPath $bundleRoot -Recurse -File -Include *.exe,*.msi,*.sig,latest.json |
  Copy-Item -Destination $artifactDir -Force

$setupInstaller = Get-ChildItem -LiteralPath $artifactDir -File -Filter "*setup.exe" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if ($setupInstaller) {
  $signaturePath = "$($setupInstaller.FullName).sig"

  if (Test-Path -LiteralPath $signaturePath) {
    $tauriConfig = Get-Content -Raw -LiteralPath (Join-Path $repoRoot "src-tauri\tauri.conf.json") |
      ConvertFrom-Json
    $platformKey = if ($Target -eq "aarch64-pc-windows-msvc") { "windows-aarch64" } else { "windows-x86_64" }
    $releaseBaseUrl = "https://github.com/IlyaMakeev0/Lume_browser/releases/latest/download"
    $latestJson = [ordered]@{
      version = $tauriConfig.version
      notes = "Lume Windows $archName release."
      pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
      platforms = [ordered]@{
        $platformKey = [ordered]@{
          signature = (Get-Content -Raw -LiteralPath $signaturePath).Trim()
          url = "$releaseBaseUrl/$($setupInstaller.Name)"
        }
      }
    } | ConvertTo-Json -Depth 6

    Set-Content -LiteralPath (Join-Path $artifactDir "latest.json") -Value $latestJson -Encoding UTF8
  }
}

Write-Output "Windows $archName installers copied to $artifactDir"
