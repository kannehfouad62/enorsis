-- CreateEnum
CREATE TYPE "ApiClientStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ApiCredentialStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApiRequestOutcome" AS ENUM ('ALLOWED', 'DENIED', 'RATE_LIMITED', 'ERROR');

-- CreateTable
CREATE TABLE "ApiClient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ApiClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "allowedScopes" TEXT[],
    "allowedIpCidrs" TEXT[],
    "requestsPerMinute" INTEGER NOT NULL DEFAULT 60,
    "requestsPerDay" INTEGER NOT NULL DEFAULT 10000,
    "createdByUserId" TEXT NOT NULL,
    "suspendedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCredential" (
    "id" TEXT NOT NULL,
    "apiClientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "status" "ApiCredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiRequestLog" (
    "id" TEXT NOT NULL,
    "apiClientId" TEXT,
    "credentialId" TEXT,
    "tenantId" TEXT,
    "requestId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "scope" TEXT,
    "outcome" "ApiRequestOutcome" NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "durationMs" INTEGER NOT NULL,
    "errorCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiClient_tenantId_status_createdAt_idx" ON "ApiClient"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiCredential_secretHash_key" ON "ApiCredential"("secretHash");

-- CreateIndex
CREATE INDEX "ApiCredential_apiClientId_status_idx" ON "ApiCredential"("apiClientId", "status");

-- CreateIndex
CREATE INDEX "ApiCredential_prefix_status_idx" ON "ApiCredential"("prefix", "status");

-- CreateIndex
CREATE INDEX "ApiRequestLog_tenantId_createdAt_idx" ON "ApiRequestLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiRequestLog_apiClientId_outcome_createdAt_idx" ON "ApiRequestLog"("apiClientId", "outcome", "createdAt");

-- CreateIndex
CREATE INDEX "ApiRequestLog_requestId_idx" ON "ApiRequestLog"("requestId");

-- AddForeignKey
ALTER TABLE "ApiClient" ADD CONSTRAINT "ApiClient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiCredential" ADD CONSTRAINT "ApiCredential_apiClientId_fkey" FOREIGN KEY ("apiClientId") REFERENCES "ApiClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiRequestLog" ADD CONSTRAINT "ApiRequestLog_apiClientId_fkey" FOREIGN KEY ("apiClientId") REFERENCES "ApiClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
