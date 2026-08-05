-- CreateEnum
CREATE TYPE "EnterpriseConnectorType" AS ENUM ('REST_API', 'SOAP_API', 'WEBHOOK', 'SFTP', 'DATABASE', 'MESSAGE_QUEUE', 'ERP', 'IDENTITY', 'COLLABORATION', 'PAYMENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "EnterpriseConnectorStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ERROR', 'DISABLED');

-- CreateEnum
CREATE TYPE "EnterpriseCredentialType" AS ENUM ('API_KEY', 'BEARER_TOKEN', 'BASIC_AUTH', 'OAUTH2', 'CLIENT_CERTIFICATE', 'SSH_KEY', 'DATABASE_CREDENTIAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "IntegrationSyncDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL');

-- CreateEnum
CREATE TYPE "IntegrationSyncStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIALLY_SUCCEEDED', 'FAILED', 'CANCELLED', 'DEAD_LETTER');

-- CreateTable
CREATE TABLE "EnterpriseConnectorDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "provider" TEXT NOT NULL,
    "connectorType" "EnterpriseConnectorType" NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "supportsInbound" BOOLEAN NOT NULL DEFAULT false,
    "supportsOutbound" BOOLEAN NOT NULL DEFAULT true,
    "supportsWebhooks" BOOLEAN NOT NULL DEFAULT false,
    "supportsIncremental" BOOLEAN NOT NULL DEFAULT false,
    "configurationSchema" JSONB,
    "capabilityMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseConnectorDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseConnectorConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectorDefinitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "EnterpriseConnectorStatus" NOT NULL DEFAULT 'DRAFT',
    "environment" TEXT NOT NULL DEFAULT 'PRODUCTION',
    "baseUrl" TEXT,
    "configuration" JSONB,
    "healthStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "lastHealthCheckAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastFailedSyncAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseConnectorConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseConnectorCredential" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credentialType" "EnterpriseCredentialType" NOT NULL,
    "secretReference" TEXT NOT NULL,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "rotatedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseConnectorCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseConnectorMapping" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceObject" TEXT NOT NULL,
    "targetObject" TEXT NOT NULL,
    "direction" "IntegrationSyncDirection" NOT NULL,
    "fieldMappings" JSONB NOT NULL,
    "transformationRules" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseConnectorMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseIntegrationSyncRun" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "mappingId" TEXT,
    "direction" "IntegrationSyncDirection" NOT NULL,
    "status" "IntegrationSyncStatus" NOT NULL DEFAULT 'QUEUED',
    "triggerType" TEXT NOT NULL DEFAULT 'MANUAL',
    "correlationId" TEXT,
    "cursor" TEXT,
    "requestedByUserId" TEXT,
    "recordsRead" INTEGER NOT NULL DEFAULT 0,
    "recordsWritten" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseIntegrationSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseWebhookEndpoint" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "signingSecretReference" TEXT,
    "acceptedEventTypes" JSONB,
    "lastReceivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseWebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseConnectorDefinition_key_key" ON "EnterpriseConnectorDefinition"("key");

-- CreateIndex
CREATE INDEX "EnterpriseConnectorDefinition_provider_connectorType_idx" ON "EnterpriseConnectorDefinition"("provider", "connectorType");

-- CreateIndex
CREATE INDEX "EnterpriseConnectorConnection_tenantId_status_idx" ON "EnterpriseConnectorConnection"("tenantId", "status");

-- CreateIndex
CREATE INDEX "EnterpriseConnectorConnection_connectorDefinitionId_status_idx" ON "EnterpriseConnectorConnection"("connectorDefinitionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseConnectorConnection_tenantId_name_key" ON "EnterpriseConnectorConnection"("tenantId", "name");

-- CreateIndex
CREATE INDEX "EnterpriseConnectorCredential_connectionId_status_idx" ON "EnterpriseConnectorCredential"("connectionId", "status");

-- CreateIndex
CREATE INDEX "EnterpriseConnectorCredential_expiresAt_idx" ON "EnterpriseConnectorCredential"("expiresAt");

-- CreateIndex
CREATE INDEX "EnterpriseConnectorMapping_connectionId_active_idx" ON "EnterpriseConnectorMapping"("connectionId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseConnectorMapping_connectionId_name_key" ON "EnterpriseConnectorMapping"("connectionId", "name");

-- CreateIndex
CREATE INDEX "EnterpriseIntegrationSyncRun_connectionId_status_createdAt_idx" ON "EnterpriseIntegrationSyncRun"("connectionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "EnterpriseIntegrationSyncRun_correlationId_idx" ON "EnterpriseIntegrationSyncRun"("correlationId");

-- CreateIndex
CREATE INDEX "EnterpriseWebhookEndpoint_connectionId_active_idx" ON "EnterpriseWebhookEndpoint"("connectionId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseWebhookEndpoint_connectionId_key_key" ON "EnterpriseWebhookEndpoint"("connectionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseWebhookEndpoint_path_key" ON "EnterpriseWebhookEndpoint"("path");

-- AddForeignKey
ALTER TABLE "EnterpriseConnectorConnection" ADD CONSTRAINT "EnterpriseConnectorConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseConnectorConnection" ADD CONSTRAINT "EnterpriseConnectorConnection_connectorDefinitionId_fkey" FOREIGN KEY ("connectorDefinitionId") REFERENCES "EnterpriseConnectorDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseConnectorCredential" ADD CONSTRAINT "EnterpriseConnectorCredential_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "EnterpriseConnectorConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseConnectorMapping" ADD CONSTRAINT "EnterpriseConnectorMapping_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "EnterpriseConnectorConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseIntegrationSyncRun" ADD CONSTRAINT "EnterpriseIntegrationSyncRun_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "EnterpriseConnectorConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseWebhookEndpoint" ADD CONSTRAINT "EnterpriseWebhookEndpoint_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "EnterpriseConnectorConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
