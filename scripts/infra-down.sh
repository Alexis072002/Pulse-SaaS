#!/usr/bin/env bash
set -euo pipefail

if ! docker info >/dev/null 2>&1; then
  echo "[pulse] Docker daemon indisponible."
  echo "[pulse] Lance Docker Desktop puis relance: pnpm infra:down"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  docker compose down
  exit 0
fi

if command -v docker-compose >/dev/null 2>&1; then
  docker-compose down
  exit 0
fi

for name in pulse-postgres pulse-redis; do
  if docker ps -a --format '{{.Names}}' | grep -qx "$name"; then
    docker stop "$name" >/dev/null || true
    docker rm "$name" >/dev/null || true
  fi
done

echo "[pulse] Infra arrêtée."
