#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[pulse] Etape 1/4: démarrage de l'infra (Postgres + Redis)..."
pnpm infra:up

echo "[pulse] Etape 2/4: génération Prisma client..."
pnpm prisma:generate

echo "[pulse] Etape 3/4: application des migrations..."
attempt=1
max_attempts=20
until pnpm db:deploy >/dev/null 2>&1; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "[pulse] Impossible d'appliquer les migrations après ${max_attempts} tentatives."
    echo "[pulse] Vérifie l'état de l'infra: pnpm infra:logs"
    exit 1
  fi

  echo "[pulse] Base pas encore prête, nouvelle tentative (${attempt}/${max_attempts})..."
  attempt=$((attempt + 1))
  sleep 2
done
echo "[pulse] Migrations appliquées."

echo "[pulse] Etape 4/4: lancement backend + frontend..."
exec pnpm dev:apps
