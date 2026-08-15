# sign.ps1 - optional Authenticode code signing for build artifacts
# Usage : powershell -ExecutionPolicy Bypass -File sign.ps1 -Path <file> [-Description "App Name"]
# Env   : SIGN_PFX       - absolute path to the .pfx certificate (required to sign)
#         SIGN_PASSWORD  - certificate password
#         SIGN_TIMESTAMP - RFC3161 timestamp server URL (default: http://timestamp.digicert.com)
# Behavior: when SIGN_PFX is not set, the script prints a skip notice and exits 0.
# NOTE: this file stays pure ASCII; Chinese strings are built from code points at runtime.
param(
  [string]$Path,
  [string]$Description = [string]([char]0x5927 + [char]0x5E03 + [char]0x8C61 + [char]0x684B) # default: 'Dabu Xiangqi' via code points
)

# Chinese words via code points (keep this file pure ASCII)
$ws = [string]([char]0x672A + [char]0x8BBE + [char]0x7F6E)  # 'not set'
$tk = [string]([char]0x8DF3 + [char]0x8FC7 + [char]0x7B7E + [char]0x540D)  # 'skip signing'
$comma = [char]0xFF0C  # full-width comma

if (-not $env:SIGN_PFX) {
  Write-Host "[sign] SIGN_PFX $ws$comma$tk"
  exit 0
}

# locate signtool.exe: PATH -> Windows SDK (x64/arm64) -> Visual Studio MSVC
$signtool = $null
$found = Get-Command signtool -ErrorAction SilentlyContinue
if ($found) { $signtool = $found.Source }

if (-not $signtool) {
  $signtool = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin\*\x64\signtool.exe' -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $signtool) {
  $signtool = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin\*\arm64\signtool.exe' -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $signtool) {
  $signtool = Get-ChildItem 'C:\Program Files\Microsoft Visual Studio\*\*\VC\Tools\MSVC\*\bin\Hostx64\x64\signtool.exe' -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}

if (-not $signtool) {
  Write-Error '[sign] signtool.exe not found (install Windows SDK or Visual Studio Build Tools)'
  exit 1
}

if (-not (Test-Path $Path)) {
  Write-Error "[sign] file not found: $Path"
  exit 1
}

$ts = $env:SIGN_TIMESTAMP
if (-not $ts) { $ts = 'http://timestamp.digicert.com' }

Write-Host "[sign] signing $Path ..."
& $signtool sign /f "$env:SIGN_PFX" /p $env:SIGN_PASSWORD /fd sha256 /tr $ts /td sha256 /d $Description /v $Path
if ($LASTEXITCODE -ne 0) {
  Write-Error "[sign] signtool failed with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}
Write-Host '[sign] done.'
exit 0
