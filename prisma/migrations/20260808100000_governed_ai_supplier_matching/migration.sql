CREATE TABLE "SupplierMarketplaceMatchRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requirementText" TEXT NOT NULL,
    "category" TEXT,
    "country" TEXT,
    "requiredCapabilities" JSONB,
    "requiredCertifications" JSONB,
    "preferredCurrency" TEXT,
    "maxLeadTimeDays" INTEGER,
    "verificationRequired" BOOLEAN NOT NULL DEFAULT false,
    "weights" JSONB,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "aiExecutionId" TEXT,
    "aiSummary" TEXT,
    "aiError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierMarketplaceMatchRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierMarketplaceMatchResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "matchRunId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "totalScore" DECIMAL(6,2) NOT NULL,
    "capabilityScore" DECIMAL(6,2) NOT NULL,
    "geographyScore" DECIMAL(6,2) NOT NULL,
    "trustScore" DECIMAL(6,2) NOT NULL,
    "performanceScore" DECIMAL(6,2) NOT NULL,
    "riskScore" DECIMAL(6,2) NOT NULL,
    "catalogScore" DECIMAL(6,2) NOT NULL,
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierMarketplaceMatchResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierMarketplaceMatchResult_matchRunId_supplierId_key"
ON "SupplierMarketplaceMatchResult"("matchRunId", "supplierId");

CREATE INDEX "SupplierMarketplaceMatchRun_tenantId_createdAt_idx"
ON "SupplierMarketplaceMatchRun"("tenantId", "createdAt");

CREATE INDEX "SupplierMarketplaceMatchRun_tenantId_status_idx"
ON "SupplierMarketplaceMatchRun"("tenantId", "status");

CREATE INDEX "SupplierMarketplaceMatchResult_tenantId_matchRunId_rank_idx"
ON "SupplierMarketplaceMatchResult"("tenantId", "matchRunId", "rank");

CREATE INDEX "SupplierMarketplaceMatchResult_tenantId_supplierId_idx"
ON "SupplierMarketplaceMatchResult"("tenantId", "supplierId");

CREATE INDEX "SupplierMarketplaceMatchResult_totalScore_idx"
ON "SupplierMarketplaceMatchResult"("totalScore");
