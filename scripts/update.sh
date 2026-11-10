#!/usr/bin/env bash
# Rebuild and reinstall after you change files in app/ (uses the TV you set up with install.sh).
set -e; cd "$(dirname "$0")/.."; DEVICE="${DEVICE:-lgtv}"
rm -rf dist && mkdir -p dist && ares-package app -o dist
ares-launch --device "$DEVICE" --close com.tvhome.lg >/dev/null 2>&1 || true
ares-install --device "$DEVICE" dist/*.ipk && ares-launch --device "$DEVICE" com.tvhome.lg
