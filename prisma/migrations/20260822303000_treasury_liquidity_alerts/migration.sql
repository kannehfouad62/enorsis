CREATE TYPE "TreasuryLiquidityAlertSeverity" AS ENUM (
  'WARNING',
  'CRITICAL'
);

CREATE TYPE "TreasuryLiquidityAlertStatus" AS ENUM (
  'OPEN',
  'ESCALATED',
  'RESOLVED'
);

CREATE TABLE "TreasuryLiquidityAlert" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "alertKey" TEXT NOT NULL,
  "severity" "TreasuryLiquidityAlertSeverity" NOT NULL,
  "status" "TreasuryLiquidityAlertStatus" NOT NULL DEFAULT 'OPEN',
  "baseCurrencyCode" TEXT NOT NULL,
  "projectedCash" DECIMAL(20,4) NOT NULL,
  "thresholdAmount" DECIMAL(20,4) NOT NULL,
  "breachDate" TIMESTAMP(3) NOT NULL,
  "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "escalatedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TreasuryLiquidityAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreasuryLiquidityAlert_alertKey_key"
ON "TreasuryLiquidityAlert"("alertKey");

CREATE INDEX "TreasuryLiquidityAlert_tenant_status_severity_idx"
ON "TreasuryLiquidityAlert"("tenantId", "status", "severity");

CREATE INDEX "TreasuryLiquidityAlert_tenant_breachDate_idx"
ON "TreasuryLiquidityAlert"("tenantId", "breachDate");
