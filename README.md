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
4. `pnpm prisma:generate`
5. `pnpm dev`

## État actuel

- Fondation architecture créée selon le CDC (phase 1 majoritairement scaffoldée).
- Design tokens, layout dashboard, pages clés et composants de base en place.
- Backend structuré avec schéma Prisma cible, conventions d'erreur/réponse, modules métiers.
- CI GitHub Actions initialisée (lint, test, build).

## Prochaines priorités (ordre CDC)

1. Implémenter OAuth Google complet (YouTube + GA4), cookies httpOnly et refresh tokens chiffrés.
2. Brancher BullMQ + Redis réel pour ingestion horaire et invalidation cache.
3. Implémenter services YouTube/GA4 + persistance `AnalyticsSnapshot`.
4. Connecter frontend au backend via tRPC et remplacer les données mock.
5. Compléter les vues `YouTube`, `Analytics`, `Corrélations`, `Rapports` + tests TDD.
