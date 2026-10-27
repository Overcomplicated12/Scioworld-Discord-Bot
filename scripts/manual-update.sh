#!/usr/bin/env bash
set -euo pipefail

trap 'echo "Deployment failed (line $LINENO). Check the error above; the bot may still be running the previous version." >&2' ERR

register_commands=false
if [[ $# -gt 1 ]] || { [[ $# -eq 1 ]] && [[ $1 != --commands ]]; }; then
  echo "Usage: bash scripts/manual-update.sh [--commands]" >&2
  exit 1
fi
if [[ $# -eq 1 ]]; then register_commands=true; fi

root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
cd -- "$root"
git_root=$(git rev-parse --show-toplevel)
if [[ $(cd -- "$git_root" && pwd -P) != "$root" ]] || [[ ! -f ecosystem.config.cjs ]] || [[ ! -f src/index.js ]] || ! node -e "process.exit(require('./package.json').name === 'scioworld-discord-bot' ? 0 : 1)"; then
  echo 'Deployment failed: this is not the ScioWorld bot repository root.' >&2
  exit 1
fi
if [[ $(git branch --show-current) != main ]]; then
  echo 'Deployment failed: check out main before updating.' >&2
  exit 1
fi
if [[ -n $(git status --porcelain --untracked-files=normal) ]]; then
  echo 'Deployment failed: commit or remove local changes before updating.' >&2
  exit 1
fi

git fetch origin main
git merge --ff-only --no-overwrite-ignore FETCH_HEAD
if [[ -f package-lock.json || -f npm-shrinkwrap.json ]]; then
  npm ci
else
  npm install
fi
if node -e "process.exit(require('./package.json').scripts?.test ? 0 : 1)"; then
  npm test
else
  echo 'No npm test script; skipping tests.'
fi
if [[ $register_commands == true ]]; then
  npm run deploy-commands
fi
pm2 startOrRestart ecosystem.config.cjs --only scioworld
pm2 save
echo 'Deployment completed successfully.'
