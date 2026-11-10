#!/usr/bin/env bash
# TV Home for LG webOS — one-step installer (macOS / Linux).
# Usage:  ./scripts/install.sh <TV-IP> <PASSPHRASE>
# Both values are shown in the Developer Mode app on your TV (turn "Key Server" ON first).
set -e
TV_IP="$1"; PASSPHRASE="$2"; DEVICE="${DEVICE:-lgtv}"
if [ -z "$TV_IP" ] || [ -z "$PASSPHRASE" ]; then
  echo "Usage: $0 <TV-IP> <PASSPHRASE>"; exit 1
fi
cd "$(dirname "$0")/.."
command -v ares-install >/dev/null || { echo "Installing LG webOS CLI (needs Node.js)…"; npm install -g @webos-tools/cli; }
ares-setup-device -r "$DEVICE" >/dev/null 2>&1 || true
ares-setup-device -a "$DEVICE" -i "host=$TV_IP" -i "port=9922" -i "username=prisoner" -i "default=true"
echo "Fetching the key from your TV…"
echo "$PASSPHRASE" | ares-novacom --device "$DEVICE" --getkey
ares-setup-device -m "$DEVICE" -i "passphrase=$PASSPHRASE" >/dev/null
echo "Building the app…"
rm -rf dist && mkdir -p dist
ares-package app -o dist
IPK=$(ls dist/*.ipk | head -1)
ares-launch --device "$DEVICE" --close com.tvhome.lg >/dev/null 2>&1 || true
ares-install --device "$DEVICE" "$IPK"
ares-launch --device "$DEVICE" com.tvhome.lg
echo "Done! TV Home is open on your TV."
