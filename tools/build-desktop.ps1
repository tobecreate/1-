# Dabu Xiangqi - one-click desktop build + portable packaging (ASCII-safe content)
# Chinese strings are resolved at runtime (tauri.conf.json / code points), so this
# file stays pure ASCII and avoids batch/PowerShell encoding pitfalls.
# NOTE: do NOT set $ErrorActionPreference='Stop' here - PowerShell 5.1 would treat
# native stderr output (e.g. tauri "Info" lines) as a terminating error and kill
# the script mid-build. Heavy commands run via cmd /c with stderr merged.
$root   = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$node   = Join-Path $root 'node-portable\node-v20.15.0-win-x64'
$npm    = Join-Path $node 'npm.cmd'
$tauri  = Join-Path $root 'node_modules\.bin\tauri.cmd'
$tools  = Join-Path $root 'tools'
$mingw  = Join-Path $root '.mingw\mingw64\bin'
$cargoB = Join-Path $root '.cargo\bin'
$rustB  = Join-Path $root '.rustup\bin'

# Map an ASCII drive so cargo/rust tooling never sees the non-ASCII project path
subst X: /d 2>$null | Out-Null
subst X: $root | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host '[ERROR] cannot map X: drive (in use?)'; exit 1 }

$env:RUSTUP_HOME = 'X:\.rustup'
$env:CARGO_HOME = 'X:\.cargo'
$env:CARGO_TARGET_DIR = 'X:\target-gnu'
$env:RUSTUP_TOOLCHAIN = 'stable-x86_64-pc-windows-gnu'
$env:PATH = "$tools;$cargoB;$rustB;$mingw;$node;$env:PATH"

# Read brand from tauri.conf.json (avoids Chinese literals in this script)
$conf = Get-Content 'X:\src-tauri\tauri.conf.json' -Raw | ConvertFrom-Json
$app  = [string]$conf.productName   # 大布象棋
$ver  = [string]$conf.version       # 1.0.0

# Chinese words via code points (keep file pure ASCII)
$jb  = [string]([char]0x4FBF + [char]0x643A + [char]0x7248)  # 便携版
$ksy = [string]([char]0x5F00 + [char]0x59CB + [char]0x6E38 + [char]0x620F)  # 开始游戏
$sym = [string]([char]0x4F7F + [char]0x7528 + [char]0x8BF4 + [char]0x660E)  # 使用说明

Push-Location 'X:\'
try {
  Write-Host '[1/4] syncing web-dist ...'
  cmd /c "call X:\node-portable\node-v20.15.0-win-x64\npm.cmd run sync:web 2>&1"
  if ($LASTEXITCODE -ne 0) { throw 'sync:web failed' }

  Write-Host '[2/4] building exe (first run takes 5-15 min) ...'
  cargo build --release --manifest-path X:\src-tauri\Cargo.toml
  if ($LASTEXITCODE -ne 0) { throw 'cargo build failed' }

  Write-Host '[2b/4] building NSIS installer ...'
  $azb = [string]([char]0x5B89 + [char]0x88C5 + [char]0x5305)  # 安装包
  New-Item -ItemType Directory -Force -Path 'X:\dist\' | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path 'X:\dist' "$app-$azb") | Out-Null
  & 'X:\.nsis\nsis-3.11\makensis.exe' 'X:\tools\install.nsi'
  if ($LASTEXITCODE -ne 0) { throw 'makensis failed' }

  Write-Host '[3/4] packaging portable edition ...'
  $rel = 'X:\target-gnu\release'
  $exe = Join-Path $rel "$app.exe"
  if (-not (Test-Path $exe)) { $exe = Join-Path $rel 'xiangqi.exe' }
  if (-not (Test-Path $exe)) { throw 'built exe not found in ' + $rel }

  $dist    = Join-Path 'X:\' 'dist'
  $portDir = Join-Path $dist "$app-$jb"
  New-Item -ItemType Directory -Force -Path $portDir | Out-Null
  Copy-Item -Force $exe (Join-Path $portDir "$app.exe")
  Copy-Item -Force (Join-Path 'X:\target-gnu\release\WebView2Loader.dll') (Join-Path $portDir 'WebView2Loader.dll')

  # 开始游戏.bat - write in GBK(936) so cmd on zh-CN systems decodes the Chinese path
  $bat = "@echo off`r`nstart `"`" `"%~dp0$app.exe`"`r`n"
  [IO.File]::WriteAllText((Join-Path $portDir "$ksy.bat"), $bat, [Text.Encoding]::GetEncoding(936))

  # 使用说明.txt - copy static UTF-8 text from tools/
  Copy-Item -Force (Join-Path 'X:\tools\portable-readme.txt') (Join-Path $portDir "$sym.txt")

  $zip = Join-Path $dist "$app-$jb.zip"
  if (Test-Path $zip) { Remove-Item $zip -Force }
  Compress-Archive -Path $portDir -DestinationPath $zip -Force

  Write-Host '[4/4] done.'
  Write-Host ('  exe       : ' + $exe)
  Write-Host ('  portable  : ' + $zip)
  Write-Host '  installer : X:\dist\ (setup exe)'
} finally {
  Pop-Location
  subst X: /d 2>$null | Out-Null
}
exit 0
