CREATE TABLE "SupplierMarketplaceOfferingMedia" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "altText" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierMarketplaceOfferingMedia_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupplierMarketplaceOfferingMedia_tenantId_offeringId_position_idx" ON "SupplierMarketplaceOfferingMedia"("tenantId", "offeringId", "position");
CREATE INDEX "SupplierMarketplaceOfferingMedia_offeringId_isPrimary_idx" ON "SupplierMarketplaceOfferingMedia"("offeringId", "isPrimary");
ALTER TABLE "SupplierMarketplaceOfferingMedia" ADD CONSTRAINT "SupplierMarketplaceOfferingMedia_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "SupplierMarketplaceOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
