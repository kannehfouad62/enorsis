-- CreateEnum
CREATE TYPE "EnterpriseAutomationConnectorType" AS ENUM ('HTTP', 'WEBHOOK', 'DOMAIN_EVENT');

-- CreateEnum
CREATE TYPE "EnterpriseAutomationConnectorStatus" AS ENUM ('ACTIVE', 'DISABLED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "EnterpriseAutomationConnector" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectorKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EnterpriseAutomationConnectorType" NOT NULL,
    "status" "EnterpriseAutomationConnectorStatus" NOT NULL DEFAULT 'ACTIVE',
    "baseUrl" TEXT,
    "allowedHosts" JSONB,
    "secretEnvKey" TEXT,
    "defaultHeaders" JSONB,
    "configuration" JSONB,
    "timeoutMs" INTEGER NOT NULL DEFAULT 15000,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseAutomationConnector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnterpriseAutomationConnector_tenantId_status_type_idx" ON "EnterpriseAutomationConnector"("tenantId", "status", "type");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseAutomationConnector_tenantId_connectorKey_key" ON "EnterpriseAutomationConnector"("tenantId", "connectorKey");

-- AddForeignKey
ALTER TABLE "EnterpriseAutomationConnector" ADD CONSTRAINT "EnterpriseAutomationConnector_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
