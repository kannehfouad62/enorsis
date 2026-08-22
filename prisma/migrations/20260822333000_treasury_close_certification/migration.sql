CREATE TYPE "TreasuryCloseCertificationStatus" AS ENUM (
  'CERTIFIED',
  'REVOKED'
);

CREATE TABLE "TreasuryCloseCertification" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "status" "TreasuryCloseCertificationStatus" NOT NULL DEFAULT 'CERTIFIED',
  "baseCurrencyCode" TEXT NOT NULL,
  "availableCash" DECIMAL(20,4) NOT NULL,
  "projected30DayCash" DECIMAL(20,4) NOT NULL,
  "criticalLiquidityAlerts" INTEGER NOT NULL,
  "criticalConnectivityIncidents" INTEGER NOT NULL,
  "materialReconciliationBlockers" INTEGER NOT NULL,
  "pendingReconciliationApprovals" INTEGER NOT NULL,
  "missingFxRateCount" INTEGER NOT NULL,
  "attestationNote" TEXT NOT NULL,
  "certifiedByUserId" TEXT NOT NULL,
  "certifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TreasuryCloseCertification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreasuryCloseCertification_tenant_period_key"
ON "TreasuryCloseCertification"("tenantId", "periodStart", "periodEnd");

CREATE INDEX "TreasuryCloseCertification_tenant_status_period_idx"
ON "TreasuryCloseCertification"("tenantId", "status", "periodEnd");
