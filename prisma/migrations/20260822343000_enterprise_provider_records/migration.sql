CREATE TABLE "EnterpriseProviderRecord" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "objectType" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "checksum" TEXT NOT NULL,
  "sourceUpdatedAt" TIMESTAMP(3),
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSyncRunId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnterpriseProviderRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnterpriseProviderRecord_connection_object_external_key"
ON "EnterpriseProviderRecord"("connectionId", "objectType", "externalId");

CREATE INDEX "EnterpriseProviderRecord_tenant_provider_object_idx"
ON "EnterpriseProviderRecord"("tenantId", "provider", "objectType");

CREATE INDEX "EnterpriseProviderRecord_connection_seen_idx"
ON "EnterpriseProviderRecord"("connectionId", "lastSeenAt");
