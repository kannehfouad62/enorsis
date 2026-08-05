-- CreateEnum
CREATE TYPE "VaultSecretStatus" AS ENUM ('ACTIVE', 'DISABLED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VaultSecretType" AS ENUM ('API_KEY', 'BEARER_TOKEN', 'BASIC_AUTH', 'OAUTH_CLIENT_SECRET', 'PRIVATE_KEY', 'CERTIFICATE', 'SSH_KEY', 'WEBHOOK_SECRET', 'DATABASE_CREDENTIAL', 'ENCRYPTION_KEY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "VaultSecretAccessAction" AS ENUM ('READ', 'WRITE', 'ROTATE', 'REVOKE');

-- CreateTable
CREATE TABLE "VaultSecret" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "secretType" "VaultSecretType" NOT NULL,
    "status" "VaultSecretStatus" NOT NULL DEFAULT 'ACTIVE',
    "provider" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'PRODUCTION',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "lastRotatedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultSecretVersion" (
    "id" TEXT NOT NULL,
    "secretId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "initializationVector" TEXT NOT NULL,
    "authenticationTag" TEXT NOT NULL,
    "keyVersion" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "rotatedFromVersion" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultSecretVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultSecretAccessPolicy" (
    "id" TEXT NOT NULL,
    "secretId" TEXT NOT NULL,
    "role" TEXT,
    "userId" TEXT,
    "serviceKey" TEXT,
    "action" "VaultSecretAccessAction" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultSecretAccessPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultSecretAccessLog" (
    "id" TEXT NOT NULL,
    "secretId" TEXT NOT NULL,
    "action" "VaultSecretAccessAction" NOT NULL,
    "actorUserId" TEXT,
    "serviceKey" TEXT,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "correlationId" TEXT,
    "secretVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultSecretAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VaultSecret_tenantId_status_idx" ON "VaultSecret"("tenantId", "status");

-- CreateIndex
CREATE INDEX "VaultSecret_provider_environment_idx" ON "VaultSecret"("provider", "environment");

-- CreateIndex
CREATE INDEX "VaultSecret_expiresAt_idx" ON "VaultSecret"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "VaultSecret_tenantId_key_key" ON "VaultSecret"("tenantId", "key");

-- CreateIndex
CREATE INDEX "VaultSecretVersion_secretId_createdAt_idx" ON "VaultSecretVersion"("secretId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VaultSecretVersion_secretId_version_key" ON "VaultSecretVersion"("secretId", "version");

-- CreateIndex
CREATE INDEX "VaultSecretAccessPolicy_secretId_action_active_idx" ON "VaultSecretAccessPolicy"("secretId", "action", "active");

-- CreateIndex
CREATE INDEX "VaultSecretAccessPolicy_userId_active_idx" ON "VaultSecretAccessPolicy"("userId", "active");

-- CreateIndex
CREATE INDEX "VaultSecretAccessPolicy_serviceKey_active_idx" ON "VaultSecretAccessPolicy"("serviceKey", "active");

-- CreateIndex
CREATE INDEX "VaultSecretAccessLog_secretId_createdAt_idx" ON "VaultSecretAccessLog"("secretId", "createdAt");

-- CreateIndex
CREATE INDEX "VaultSecretAccessLog_actorUserId_createdAt_idx" ON "VaultSecretAccessLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "VaultSecretAccessLog_serviceKey_createdAt_idx" ON "VaultSecretAccessLog"("serviceKey", "createdAt");

-- AddForeignKey
ALTER TABLE "VaultSecret" ADD CONSTRAINT "VaultSecret_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultSecretVersion" ADD CONSTRAINT "VaultSecretVersion_secretId_fkey" FOREIGN KEY ("secretId") REFERENCES "VaultSecret"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultSecretAccessPolicy" ADD CONSTRAINT "VaultSecretAccessPolicy_secretId_fkey" FOREIGN KEY ("secretId") REFERENCES "VaultSecret"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultSecretAccessLog" ADD CONSTRAINT "VaultSecretAccessLog_secretId_fkey" FOREIGN KEY ("secretId") REFERENCES "VaultSecret"("id") ON DELETE CASCADE ON UPDATE CASCADE;
