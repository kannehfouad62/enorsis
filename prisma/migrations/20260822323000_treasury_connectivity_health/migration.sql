ALTER TABLE "TreasuryExternalAccountLink"
ADD COLUMN "expectedFeedMinutes" INTEGER NOT NULL DEFAULT 1440;

CREATE TYPE "TreasuryConnectivityHealthStatus" AS ENUM (
  'OPEN',
  'RESOLVED'
);

CREATE TYPE "TreasuryConnectivityHealthSeverity" AS ENUM (
  'WARNING',
  'CRITICAL'
);

CREATE TABLE "TreasuryConnectivityHealthIncident" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "incidentKey" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "externalAccountLinkId" TEXT,
  "severity" "TreasuryConnectivityHealthSeverity" NOT NULL,
  "status" "TreasuryConnectivityHealthStatus" NOT NULL DEFAULT 'OPEN',
  "incidentType" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TreasuryConnectivityHealthIncident_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreasuryConnectivityHealthIncident_key"
ON "TreasuryConnectivityHealthIncident"("incidentKey");

CREATE INDEX "TreasuryConnectivityHealthIncident_tenant_status_severity_idx"
ON "TreasuryConnectivityHealthIncident"("tenantId", "status", "severity");

CREATE INDEX "TreasuryConnectivityHealthIncident_integration_status_idx"
ON "TreasuryConnectivityHealthIncident"("integrationId", "status");

CREATE INDEX "TreasuryConnectivityHealthIncident_link_status_idx"
ON "TreasuryConnectivityHealthIncident"("externalAccountLinkId", "status");
