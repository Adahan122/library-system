#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[libsystem] missing: $1"
    exit 1
  }
}

need_cmd node
if [[ -x "$REPO/backend/venv/bin/python" ]]; then
  PY="$REPO/backend/venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PY="python3"
else
  need_cmd python
  PY="python"
fi

if [[ ! -d "$REPO/backend/node_modules" ]]; then
  echo "[libsystem] npm install in backend..."
  (cd "$REPO/backend" && npm install)
fi
if [[ ! -d "$REPO/frontend/node_modules" ]]; then
  echo "[libsystem] npm install in frontend..."
  (cd "$REPO/frontend" && npm install)
fi

echo "[libsystem] starting api :4000, django :8000, vite :5173 ..."
(cd "$REPO/backend" && npm run dev) &
sleep 2
(cd "$REPO/backend" && exec "$PY" manage.py runserver 8000) &
sleep 2
(cd "$REPO/frontend" && npm run dev) &
sleep 3

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:5173/" || true
elif command -v open >/dev/null 2>&1; then
  open "http://localhost:5173/" || true
fi

echo "[libsystem] running. press ctrl+c to stop all."
wait
