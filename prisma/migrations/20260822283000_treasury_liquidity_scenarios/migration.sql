CREATE TABLE "TreasuryLiquidityPolicy" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "minimumCashBuffer" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "warningThreshold" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "criticalThreshold" DECIMAL(20,4) NOT NULL DEFAULT 0,
  "alertEnabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TreasuryLiquidityPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TreasuryForecastScenario" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "inflowMultiplier" DECIMAL(8,4) NOT NULL DEFAULT 1,
  "outflowMultiplier" DECIMAL(8,4) NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TreasuryForecastScenario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreasuryLiquidityPolicy_tenantId_key"
ON "TreasuryLiquidityPolicy"("tenantId");

CREATE UNIQUE INDEX "TreasuryForecastScenario_tenantId_name_key"
ON "TreasuryForecastScenario"("tenantId", "name");

CREATE INDEX "TreasuryForecastScenario_tenantId_active_name_idx"
ON "TreasuryForecastScenario"("tenantId", "active", "name");
