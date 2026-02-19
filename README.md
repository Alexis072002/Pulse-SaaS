# Pulse SaaS

Pulse est un SaaS analytics multi-plateforme (YouTube + GA4) basé sur `Next.js 14`, `NestJS`, `TypeScript strict`, `Prisma`, `Redis` et `BullMQ`.

## Monorepo

- `/apps/frontend`: Next.js 14 App Router, UI dashboard, design system dark/light.
- `/apps/backend`: NestJS modulaire (auth, analytics, reports, ai, queue), Prisma, conventions API.
- `/packages/shared`: types métiers (`metrics`) + contrat tRPC partagé.

## Démarrage local

1. `npm i -g pnpm@9`
2. `cp .env.example .env`
3. `pnpm install`
4. `pnpm dev`

Recommandé: `Node.js 20 LTS` ou `22 LTS` (Prisma migrations instables sur Node 25).

`pnpm dev` lance automatiquement:
- l'infra locale (Postgres + Redis),
- la génération Prisma,
- les migrations (`prisma migrate deploy`),
- puis le backend + frontend en parallèle.

## Dépannage base locale

- Si le backend affiche `P1001 Can't reach database server at localhost:5432`, démarre l'infra:
  - `pnpm infra:up`
- Vérifie l'état des containers:
  - `pnpm infra:logs`
- Stopper l'infra:
  - `pnpm infra:down`

## OAuth Google (test local)

- Ouvre `/login` puis clique `Continuer avec Google`.
- Tu peux renseigner `gaPropertyId` dans le formulaire (optionnel si `GOOGLE_GA4_PROPERTY_ID` est défini dans `.env`).
- Après callback, un cookie `pulse_access_token` est créé et les routes dashboard sont protégées.
- Les tokens Google sont chiffrés côté backend avant stockage (`AES-256-GCM`).

## Ops panel caché

- URL: `/internal/ops` (non présent dans la sidebar).
- Si `OPS_PANEL_KEY` est défini dans `.env`, l'accès nécessite `?key=...` dans l'URL.
- Endpoints backend exposés:
  - `GET /ops/health`
  - `GET /ops/metrics`
  - `GET /ops/logs?limit=120`

## Mode 0€ (sans OpenAI)

- `OPENAI_API_KEY` peut rester vide.
- Le digest rapport utilise un moteur heuristique local (aucun coût API).

## Workspace + RBAC

- Chaque utilisateur est rattaché à un `Workspace` actif.
- Rôles disponibles: `OWNER`, `EDITOR`, `VIEWER`.
- Actions protégées (ex: génération/retry de rapports) nécessitent `OWNER` ou `EDITOR`.
- Endpoint de contexte: `GET /workspace/context`.

## Rapports V2

- Génération asynchrone via queue interne:
  - `POST /reports/generate`
  - `POST /reports/:id/retry`
  - `POST /reports/:id/deliveries/:deliveryId/retry`
- Scheduling configurable:
  - `GET /reports/schedules`
  - `POST /reports/schedules/:type`
- Historique des envois par rapport (`deliveries`) visible dans la page `/reports`.
- PDF via Puppeteer si disponible, sinon fallback PDF local.

## Sécurité renforcée

- Rate limiting par route sensible via décorateur `@RouteRateLimit`.
- RBAC global via guard `@Roles(...)`.
- Rotation de clés de chiffrement:
  - `GOOGLE_TOKENS_ENCRYPTION_SECRETS=k2:secret_new,k1:secret_old`
- Audit trail en base (`AuditLog`) pour login/logout, rapports, rotation secrets.

## Performance & DX

- Skeleton global du dashboard: `apps/frontend/src/app/(dashboard)/loading.tsx`.
- Lighthouse CI ajouté: `.github/workflows/lighthouse.yml`.
- Config perf budget: `apps/frontend/lighthouserc.json`.

## Tests

- `pnpm --filter @pulse/backend test` (unit tests locaux)
- `pnpm --filter @pulse/backend test:ci` (coverage stricte pour CI)

## État actuel

- Fondation architecture créée selon le CDC (phase 1 majoritairement scaffoldée).
- Design tokens, layout dashboard, pages clés et composants de base en place.
- Backend structuré avec schéma Prisma cible, conventions d'erreur/réponse, modules métiers.
- CI GitHub Actions initialisée (lint, test, build).

## Prochaines priorités (ordre CDC)

1. Brancher BullMQ + Redis réel pour ingestion horaire et invalidation cache.
2. Persister users/tokens/snapshots via Prisma (actuellement session en mémoire pour le dev local).
3. Connecter frontend au backend via tRPC end-to-end.
4. Compléter les vues `Analytics`, `Corrélations`, `Rapports`.
5. Étendre la couverture tests backend/front selon les seuils CDC.
