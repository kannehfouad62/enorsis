CREATE TYPE "TreasuryConnectivitySyncStatus" AS ENUM (
  'SUCCEEDED',
  'FAILED'
);

CREATE TABLE "TreasuryExternalAccountLink" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "treasuryAccountId" TEXT NOT NULL,
  "externalAccountId" TEXT NOT NULL,
  "externalAccountName" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TreasuryExternalAccountLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TreasuryConnectivitySyncLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "integrationEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "status" "TreasuryConnectivitySyncStatus" NOT NULL,
  "message" TEXT,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TreasuryConnectivitySyncLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreasuryExternalAccountLink_integration_external_key"
ON "TreasuryExternalAccountLink"("integrationId", "externalAccountId");

CREATE INDEX "TreasuryExternalAccountLink_tenant_active_idx"
ON "TreasuryExternalAccountLink"("tenantId", "active");

CREATE INDEX "TreasuryExternalAccountLink_account_active_idx"
ON "TreasuryExternalAccountLink"("treasuryAccountId", "active");

CREATE UNIQUE INDEX "TreasuryConnectivitySyncLog_event_key"
ON "TreasuryConnectivitySyncLog"("integrationEventId");

CREATE INDEX "TreasuryConnectivitySyncLog_tenant_processed_idx"
ON "TreasuryConnectivitySyncLog"("tenantId", "processedAt");

CREATE INDEX "TreasuryConnectivitySyncLog_integration_status_processed_idx"
ON "TreasuryConnectivitySyncLog"("integrationId", "status", "processedAt");
