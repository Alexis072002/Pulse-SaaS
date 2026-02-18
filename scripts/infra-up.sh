#!/usr/bin/env bash
set -euo pipefail

if ! docker info >/dev/null 2>&1; then
  echo "[pulse] Docker daemon indisponible."
  echo "[pulse] Lance Docker Desktop puis relance: pnpm infra:up"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  docker compose up -d
  exit 0
fi

if command -v docker-compose >/dev/null 2>&1; then
  docker-compose up -d
  exit 0
fi

echo "[pulse] Compose indisponible, fallback sur docker run..."

if ! docker volume inspect pulse_postgres_data >/dev/null 2>&1; then
  docker volume create pulse_postgres_data >/dev/null
fi

if ! docker volume inspect pulse_redis_data >/dev/null 2>&1; then
  docker volume create pulse_redis_data >/dev/null
fi

if docker ps -a --format '{{.Names}}' | grep -qx 'pulse-postgres'; then
  docker start pulse-postgres >/dev/null
else
  docker run -d \
    --name pulse-postgres \
    --restart unless-stopped \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=pulse \
    -p 5432:5432 \
    -v pulse_postgres_data:/var/lib/postgresql/data \
    postgres:16-alpine >/dev/null
fi

if docker ps -a --format '{{.Names}}' | grep -qx 'pulse-redis'; then
  docker start pulse-redis >/dev/null
else
  docker run -d \
    --name pulse-redis \
    --restart unless-stopped \
    -p 6379:6379 \
    -v pulse_redis_data:/data \
    redis:7-alpine >/dev/null
fi

echo "[pulse] Infra démarrée (postgres:5432, redis:6379)."
