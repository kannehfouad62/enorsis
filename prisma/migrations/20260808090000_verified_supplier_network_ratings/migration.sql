CREATE TABLE "SupplierMarketplaceVerification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "marketplaceProfileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "verificationType" TEXT NOT NULL DEFAULT 'STANDARD',
    "evidenceSummary" TEXT,
    "evidenceRefs" JSONB,
    "reviewerNotes" TEXT,
    "requestedByUserId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspensionReason" TEXT,
    "reinstatedAt" TIMESTAMP(3),
    "reinstatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierMarketplaceVerification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierMarketplaceRating" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "marketplaceProfileId" TEXT,
    "ratingType" TEXT NOT NULL DEFAULT 'BUYER_REVIEW',
    "overallRating" DECIMAL(3,2) NOT NULL,
    "qualityRating" DECIMAL(3,2),
    "deliveryRating" DECIMAL(3,2),
    "serviceRating" DECIMAL(3,2),
    "valueRating" DECIMAL(3,2),
    "complianceRating" DECIMAL(3,2),
    "reviewTitle" TEXT,
    "reviewText" TEXT,
    "contextType" TEXT,
    "contextReference" TEXT,
    "reviewerUserId" TEXT,
    "reviewerLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierMarketplaceRating_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupplierMarketplaceVerification_tenantId_supplierId_status_idx"
ON "SupplierMarketplaceVerification"("tenantId", "supplierId", "status");

CREATE INDEX "SupplierMarketplaceVerification_tenantId_status_requestedAt_idx"
ON "SupplierMarketplaceVerification"("tenantId", "status", "requestedAt");

CREATE INDEX "SupplierMarketplaceVerification_marketplaceProfileId_idx"
ON "SupplierMarketplaceVerification"("marketplaceProfileId");

CREATE INDEX "SupplierMarketplaceVerification_expiresAt_idx"
ON "SupplierMarketplaceVerification"("expiresAt");

CREATE INDEX "SupplierMarketplaceRating_tenantId_supplierId_status_idx"
ON "SupplierMarketplaceRating"("tenantId", "supplierId", "status");

CREATE INDEX "SupplierMarketplaceRating_tenantId_createdAt_idx"
ON "SupplierMarketplaceRating"("tenantId", "createdAt");

CREATE INDEX "SupplierMarketplaceRating_marketplaceProfileId_idx"
ON "SupplierMarketplaceRating"("marketplaceProfileId");

CREATE INDEX "SupplierMarketplaceRating_contextType_contextReference_idx"
ON "SupplierMarketplaceRating"("contextType", "contextReference");
