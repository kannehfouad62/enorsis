-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('SAP', 'ORACLE', 'MICROSOFT_DYNAMICS', 'NETSUITE', 'WORKDAY', 'COUPA', 'ARIBA', 'GENERIC_REST', 'GENERIC_SFTP', 'GENERIC_WEBHOOK', 'OTHER');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ERROR', 'RETIRED');

-- CreateEnum
CREATE TYPE "IntegrationDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "IntegrationJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "IntegrationEventStatus" AS ENUM ('RECEIVED', 'VALIDATED', 'PROCESSED', 'REJECTED', 'FAILED');

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "direction" "IntegrationDirection" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'DRAFT',
    "baseUrl" TEXT,
    "secretReference" TEXT,
    "webhookSecretHash" TEXT,
    "outboundEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inboundEnabled" BOOLEAN NOT NULL DEFAULT false,
    "retryLimit" INTEGER NOT NULL DEFAULT 3,
    "timeoutSeconds" INTEGER NOT NULL DEFAULT 30,
    "lastSuccessfulAt" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationMapping" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceEntity" TEXT NOT NULL,
    "targetEntity" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "fieldMappings" JSONB NOT NULL,
    "transforms" JSONB,
    "validationRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationJob" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "mappingId" TEXT,
    "direction" "IntegrationDirection" NOT NULL,
    "status" "IntegrationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "resourceType" TEXT,
    "resourceId" TEXT,
    "payload" JSONB NOT NULL,
    "response" JSONB,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "correlationId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationEvent" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "externalEventId" TEXT,
    "eventType" TEXT NOT NULL,
    "status" "IntegrationEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "headers" JSONB,
    "payload" JSONB NOT NULL,
    "signatureValid" BOOLEAN,
    "processedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "errorMessage" TEXT,
    "correlationId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationConnection_tenantId_status_provider_idx" ON "IntegrationConnection"("tenantId", "status", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_tenantId_key_key" ON "IntegrationConnection"("tenantId", "key");

-- CreateIndex
CREATE INDEX "IntegrationMapping_integrationId_isActive_idx" ON "IntegrationMapping"("integrationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationMapping_integrationId_key_version_key" ON "IntegrationMapping"("integrationId", "key", "version");

-- CreateIndex
CREATE INDEX "IntegrationJob_integrationId_status_nextAttemptAt_idx" ON "IntegrationJob"("integrationId", "status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "IntegrationJob_resourceType_resourceId_idx" ON "IntegrationJob"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "IntegrationJob_correlationId_idx" ON "IntegrationJob"("correlationId");

-- CreateIndex
CREATE INDEX "IntegrationEvent_integrationId_status_receivedAt_idx" ON "IntegrationEvent"("integrationId", "status", "receivedAt");

-- CreateIndex
CREATE INDEX "IntegrationEvent_correlationId_idx" ON "IntegrationEvent"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationEvent_integrationId_externalEventId_key" ON "IntegrationEvent"("integrationId", "externalEventId");

-- AddForeignKey
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationMapping" ADD CONSTRAINT "IntegrationMapping_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationJob" ADD CONSTRAINT "IntegrationJob_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationEvent" ADD CONSTRAINT "IntegrationEvent_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
