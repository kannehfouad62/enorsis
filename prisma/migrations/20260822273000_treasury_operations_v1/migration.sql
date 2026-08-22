CREATE TYPE "TreasuryAccountType" AS ENUM (
  'OPERATING',
  'PAYROLL',
  'TAX',
  'RESERVE',
  'INVESTMENT',
  'OTHER'
);

CREATE TYPE "TreasuryCashFlowType" AS ENUM (
  'INFLOW',
  'OUTFLOW'
);

CREATE TYPE "TreasuryCashFlowStatus" AS ENUM (
  'EXPECTED',
  'CONFIRMED',
  'CANCELLED'
);

CREATE TABLE "TreasuryAccount" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "institutionName" TEXT,
  "accountType" "TreasuryAccountType" NOT NULL DEFAULT 'OPERATING',
  "currencyCode" TEXT NOT NULL DEFAULT 'USD',
  "lastFour" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TreasuryAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TreasuryBalanceSnapshot" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "treasuryAccountId" TEXT NOT NULL,
  "balanceDate" TIMESTAMP(3) NOT NULL,
  "availableBalance" DECIMAL(20,4) NOT NULL,
  "ledgerBalance" DECIMAL(20,4),
  "sourceReference" TEXT,
  "recordedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TreasuryBalanceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TreasuryCashFlowForecast" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "treasuryAccountId" TEXT,
  "type" "TreasuryCashFlowType" NOT NULL,
  "status" "TreasuryCashFlowStatus" NOT NULL DEFAULT 'EXPECTED',
  "title" TEXT NOT NULL,
  "description" TEXT,
  "currencyCode" TEXT NOT NULL DEFAULT 'USD',
  "amount" DECIMAL(20,4) NOT NULL,
  "expectedDate" TIMESTAMP(3) NOT NULL,
  "sourceModule" TEXT,
  "sourceRecordId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TreasuryCashFlowForecast_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreasuryAccount_tenantId_name_key"
ON "TreasuryAccount"("tenantId", "name");

CREATE INDEX "TreasuryAccount_tenantId_active_accountType_idx"
ON "TreasuryAccount"("tenantId", "active", "accountType");

CREATE UNIQUE INDEX "TreasuryBalanceSnapshot_treasuryAccountId_balanceDate_key"
ON "TreasuryBalanceSnapshot"("treasuryAccountId", "balanceDate");

CREATE INDEX "TreasuryBalanceSnapshot_tenantId_balanceDate_idx"
ON "TreasuryBalanceSnapshot"("tenantId", "balanceDate");

CREATE INDEX "TreasuryBalanceSnapshot_treasuryAccountId_balanceDate_idx"
ON "TreasuryBalanceSnapshot"("treasuryAccountId", "balanceDate");

CREATE INDEX "TreasuryCashFlowForecast_tenantId_status_expectedDate_idx"
ON "TreasuryCashFlowForecast"("tenantId", "status", "expectedDate");

CREATE INDEX "TreasuryCashFlowForecast_treasuryAccountId_expectedDate_idx"
ON "TreasuryCashFlowForecast"("treasuryAccountId", "expectedDate");

CREATE INDEX "TreasuryCashFlowForecast_sourceModule_sourceRecordId_idx"
ON "TreasuryCashFlowForecast"("sourceModule", "sourceRecordId");
