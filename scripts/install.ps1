# TV Home for LG webOS — one-step installer (Windows PowerShell).
# Usage:  .\scripts\install.ps1 -TvIp 192.168.1.20 -Passphrase ABC123
param([Parameter(Mandatory=$true)][string]$TvIp, [Parameter(Mandatory=$true)][string]$Passphrase, [string]$Device = "lgtv")
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
if (-not (Get-Command ares-install -ErrorAction SilentlyContinue)) {
  Write-Host "Installing LG webOS CLI (needs Node.js)..."; npm install -g @webos-tools/cli
}
ares-setup-device -r $Device 2>$null | Out-Null
ares-setup-device -a $Device -i "host=$TvIp" -i "port=9922" -i "username=prisoner" -i "default=true"
Write-Host "Fetching the key from your TV..."
$Passphrase | ares-novacom --device $Device --getkey
ares-setup-device -m $Device -i "passphrase=$Passphrase" | Out-Null
Write-Host "Building the app..."
if (Test-Path dist) { Remove-Item dist -Recurse -Force }
New-Item -ItemType Directory dist | Out-Null
ares-package app -o dist
$ipk = Get-ChildItem dist\*.ipk | Select-Object -First 1
ares-launch --device $Device --close com.tvhome.lg 2>$null | Out-Null
ares-install --device $Device $ipk.FullName
ares-launch --device $Device com.tvhome.lg
Write-Host "Done! TV Home is open on your TV."
