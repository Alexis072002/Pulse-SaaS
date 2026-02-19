-- AlterEnum
ALTER TYPE "ReportStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('USER', 'SYSTEM');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "activeWorkspaceId" TEXT;
ALTER TABLE "AnalyticsSnapshot" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Report" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "AiDigest" ADD COLUMN "workspaceId" TEXT;

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvitation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'VIEWER',
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkspaceInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "hourUtc" INTEGER NOT NULL DEFAULT 9,
    "minuteUtc" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportDelivery" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "channel" "DeliveryChannel" NOT NULL DEFAULT 'IN_APP',
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "recipient" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReportDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecretVersion" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kid" TEXT NOT NULL,
    "materialHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "rotatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecretVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorType" "AuditActorType" NOT NULL DEFAULT 'USER',
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Backfill workspace data for existing users
INSERT INTO "Workspace" ("id", "name", "slug", "ownerId", "createdAt", "updatedAt")
SELECT
    'ws_' || u."id",
    'Workspace ' || RIGHT(u."id", 6),
    LOWER(REGEXP_REPLACE(SPLIT_PART(u."email", '@', 1), '[^a-z0-9]+', '-', 'g')) || '-' || u."id",
    u."id",
    NOW(),
    NOW()
FROM "User" u
WHERE NOT EXISTS (
    SELECT 1 FROM "Workspace" w WHERE w."ownerId" = u."id"
);

INSERT INTO "WorkspaceMember" ("id", "workspaceId", "userId", "role", "createdAt", "updatedAt")
SELECT
    'wsm_' || u."id",
    w."id",
    u."id",
    'OWNER'::"WorkspaceRole",
    NOW(),
    NOW()
FROM "User" u
JOIN "Workspace" w ON w."ownerId" = u."id"
WHERE NOT EXISTS (
    SELECT 1
    FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = w."id" AND wm."userId" = u."id"
);

UPDATE "User" u
SET "activeWorkspaceId" = w."id"
FROM "Workspace" w
WHERE w."ownerId" = u."id"
  AND u."activeWorkspaceId" IS NULL;

UPDATE "AnalyticsSnapshot" s
SET "workspaceId" = u."activeWorkspaceId"
FROM "User" u
WHERE s."userId" = u."id"
  AND s."workspaceId" IS NULL;

UPDATE "Report" r
SET "workspaceId" = u."activeWorkspaceId"
FROM "User" u
WHERE r."userId" = u."id"
  AND r."workspaceId" IS NULL;

UPDATE "AiDigest" d
SET "workspaceId" = u."activeWorkspaceId"
FROM "User" u
WHERE d."userId" = u."id"
  AND d."workspaceId" IS NULL;

-- Enforce non-null workspace ownership after backfill
ALTER TABLE "AnalyticsSnapshot" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Report" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "AiDigest" ALTER COLUMN "workspaceId" SET NOT NULL;

-- Drop obsolete unique/indexes before recreating workspace-scoped variants
DROP INDEX IF EXISTS "AnalyticsSnapshot_userId_source_date_key";
DROP INDEX IF EXISTS "AiDigest_userId_weekStart_key";

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");
CREATE INDEX "WorkspaceMember_userId_role_idx" ON "WorkspaceMember"("userId", "role");
CREATE UNIQUE INDEX "WorkspaceInvitation_token_key" ON "WorkspaceInvitation"("token");
CREATE INDEX "WorkspaceInvitation_workspaceId_status_idx" ON "WorkspaceInvitation"("workspaceId", "status");
CREATE INDEX "WorkspaceInvitation_email_status_idx" ON "WorkspaceInvitation"("email", "status");
CREATE INDEX "User_activeWorkspaceId_idx" ON "User"("activeWorkspaceId");
CREATE INDEX "AnalyticsSnapshot_workspaceId_source_date_idx" ON "AnalyticsSnapshot"("workspaceId", "source", "date");
CREATE UNIQUE INDEX "AnalyticsSnapshot_workspaceId_userId_source_date_key" ON "AnalyticsSnapshot"("workspaceId", "userId", "source", "date");
CREATE INDEX "Report_workspaceId_status_createdAt_idx" ON "Report"("workspaceId", "status", "createdAt");
CREATE INDEX "AiDigest_workspaceId_weekStart_idx" ON "AiDigest"("workspaceId", "weekStart");
CREATE UNIQUE INDEX "AiDigest_workspaceId_weekStart_key" ON "AiDigest"("workspaceId", "weekStart");
CREATE UNIQUE INDEX "ReportSchedule_workspaceId_type_key" ON "ReportSchedule"("workspaceId", "type");
CREATE INDEX "ReportSchedule_enabled_type_idx" ON "ReportSchedule"("enabled", "type");
CREATE INDEX "ReportDelivery_workspaceId_status_createdAt_idx" ON "ReportDelivery"("workspaceId", "status", "createdAt");
CREATE INDEX "ReportDelivery_reportId_createdAt_idx" ON "ReportDelivery"("reportId", "createdAt");
CREATE UNIQUE INDEX "SecretVersion_workspaceId_kid_key" ON "SecretVersion"("workspaceId", "kid");
CREATE INDEX "SecretVersion_workspaceId_isActive_idx" ON "SecretVersion"("workspaceId", "isActive");
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_activeWorkspaceId_fkey" FOREIGN KEY ("activeWorkspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvitation" ADD CONSTRAINT "WorkspaceInvitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiDigest" ADD CONSTRAINT "AiDigest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportDelivery" ADD CONSTRAINT "ReportDelivery_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportDelivery" ADD CONSTRAINT "ReportDelivery_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecretVersion" ADD CONSTRAINT "SecretVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecretVersion" ADD CONSTRAINT "SecretVersion_rotatedByUserId_fkey" FOREIGN KEY ("rotatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
