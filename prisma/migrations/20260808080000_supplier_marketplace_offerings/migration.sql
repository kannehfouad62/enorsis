CREATE TABLE "SupplierMarketplaceOffering" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "marketplaceProfileId" TEXT,
    "offeringType" TEXT NOT NULL DEFAULT 'PRODUCT',
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "category" TEXT,
    "subcategory" TEXT,
    "manufacturer" TEXT,
    "brand" TEXT,
    "modelNumber" TEXT,
    "unitOfMeasure" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "unitPrice" DECIMAL(18,4),
    "minimumOrderQty" DECIMAL(18,4),
    "leadTimeDays" INTEGER,
    "availabilityStatus" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "countriesAvailable" JSONB,
    "certifications" JSONB,
    "attributes" JSONB,
    "keywords" JSONB,
    "imageRef" TEXT,
    "documentRef" TEXT,
    "externalUrl" TEXT,
    "marketplaceVisible" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierMarketplaceOffering_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierMarketplaceOffering_tenantId_supplierId_sku_key"
ON "SupplierMarketplaceOffering"("tenantId", "supplierId", "sku");

CREATE INDEX "SupplierMarketplaceOffering_tenantId_marketplaceVisible_offeringType_idx"
ON "SupplierMarketplaceOffering"("tenantId", "marketplaceVisible", "offeringType");

CREATE INDEX "SupplierMarketplaceOffering_tenantId_category_availabilityStatus_idx"
ON "SupplierMarketplaceOffering"("tenantId", "category", "availabilityStatus");

CREATE INDEX "SupplierMarketplaceOffering_supplierId_marketplaceVisible_idx"
ON "SupplierMarketplaceOffering"("supplierId", "marketplaceVisible");

CREATE INDEX "SupplierMarketplaceOffering_marketplaceProfileId_idx"
ON "SupplierMarketplaceOffering"("marketplaceProfileId");

CREATE INDEX "SupplierMarketplaceOffering_name_idx"
ON "SupplierMarketplaceOffering"("name");
