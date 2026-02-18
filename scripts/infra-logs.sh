#!/usr/bin/env bash
set -euo pipefail

if ! docker info >/dev/null 2>&1; then
  echo "[pulse] Docker daemon indisponible."
  echo "[pulse] Lance Docker Desktop puis relance: pnpm infra:logs"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  docker compose logs -f postgres redis
  exit 0
fi

if command -v docker-compose >/dev/null 2>&1; then
  docker-compose logs -f postgres redis
  exit 0
fi

echo "[pulse] Logs Postgres"
docker logs --tail 100 -f pulse-postgres
