#!/usr/bin/env bash
# Lanceur HyperFrames : exécute le CLI via le launcher officiel des skills.
# Usage : scripts/hyperframes.sh <commande> [args...]   (ex. : doctor, init, lint, render)
# Si un chrome-headless-shell est disponible, il est utilisé pour activer la
# capture rapide "BeginFrame" (rendu ~10x plus rapide qu'avec Chrome classique).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAUNCHER="$REPO_ROOT/.claude/skills/hyperframes/scripts/plugin-cli.mjs"

if [[ -z "${HYPERFRAMES_KEEP_CHROME:-}" ]]; then
  for shell in /opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell; do
    if [[ -x "$shell" ]]; then
      export PUPPETEER_EXECUTABLE_PATH="$shell" CHROME_PATH="$shell" CHROME_BIN="$shell"
      break
    fi
  done
fi

exec node "$LAUNCHER" "$@"
