CREATE TABLE "SupplierMarketplaceProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "marketplaceVisible" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "headline" TEXT,
    "description" TEXT,
    "websiteUrl" TEXT,
    "headquartersCountry" TEXT,
    "countriesServed" JSONB,
    "industries" JSONB,
    "categories" JSONB,
    "capabilities" JSONB,
    "certifications" JSONB,
    "keywords" JSONB,
    "minimumOrderValue" DECIMAL(18,2),
    "preferredCurrency" TEXT DEFAULT 'USD',
    "leadTimeDays" INTEGER,
    "employeeBand" TEXT,
    "annualRevenueBand" TEXT,
    "sustainabilityTags" JSONB,
    "diversityTags" JSONB,
    "qualityScore" DECIMAL(5,2),
    "riskScore" DECIMAL(5,2),
    "performanceScore" DECIMAL(5,2),
    "marketplaceScore" DECIMAL(5,2),
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierMarketplaceProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierMarketplaceProfile_tenantId_supplierId_key"
ON "SupplierMarketplaceProfile"("tenantId", "supplierId");

CREATE INDEX "SupplierMarketplaceProfile_tenantId_marketplaceVisible_verificationStatus_idx"
ON "SupplierMarketplaceProfile"("tenantId", "marketplaceVisible", "verificationStatus");

CREATE INDEX "SupplierMarketplaceProfile_tenantId_marketplaceScore_idx"
ON "SupplierMarketplaceProfile"("tenantId", "marketplaceScore");

CREATE INDEX "SupplierMarketplaceProfile_headquartersCountry_idx"
ON "SupplierMarketplaceProfile"("headquartersCountry");
