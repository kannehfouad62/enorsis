CREATE TABLE "TreasuryFxPolicy" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "baseCurrencyCode" TEXT NOT NULL DEFAULT 'USD',
  "updatedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TreasuryFxPolicy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TreasuryFxRate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "fromCurrencyCode" TEXT NOT NULL,
  "toCurrencyCode" TEXT NOT NULL,
  "rate" DECIMAL(20,8) NOT NULL,
  "effectiveDate" TIMESTAMP(3) NOT NULL,
  "sourceReference" TEXT,
  "recordedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TreasuryFxRate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreasuryFxPolicy_tenantId_key"
ON "TreasuryFxPolicy"("tenantId");

CREATE UNIQUE INDEX "TreasuryFxRate_pair_date_key"
ON "TreasuryFxRate"(
  "tenantId",
  "fromCurrencyCode",
  "toCurrencyCode",
  "effectiveDate"
);

CREATE INDEX "TreasuryFxRate_pair_date_idx"
ON "TreasuryFxRate"(
  "tenantId",
  "fromCurrencyCode",
  "toCurrencyCode",
  "effectiveDate"
);
