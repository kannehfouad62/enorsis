CREATE TABLE "MarketplacePurchaseRequestLineBinding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "purchaseRequestId" TEXT NOT NULL,
    "purchaseRequestLineId" TEXT NOT NULL,
    "marketplaceOfferingId" TEXT NOT NULL,
    "sellerTenantId" TEXT NOT NULL,
    "sellerSupplierId" TEXT NOT NULL,
    "offeringName" TEXT NOT NULL,
    "sku" TEXT,
    "imageRef" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "leadTimeDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketplacePurchaseRequestLineBinding_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketplacePurchaseRequestLineBinding_purchaseRequestLineId_key"
ON "MarketplacePurchaseRequestLineBinding"("purchaseRequestLineId");
CREATE INDEX "MarketplacePurchaseRequestLineBinding_tenantId_purchaseRequestId_idx"
ON "MarketplacePurchaseRequestLineBinding"("tenantId", "purchaseRequestId");
CREATE INDEX "MarketplacePurchaseRequestLineBinding_sellerTenantId_createdAt_idx"
ON "MarketplacePurchaseRequestLineBinding"("sellerTenantId", "createdAt");

CREATE TABLE "MarketplaceSellerOrder" (
    "id" TEXT NOT NULL,
    "buyerTenantId" TEXT NOT NULL,
    "sellerTenantId" TEXT NOT NULL,
    "purchaseRequestId" TEXT NOT NULL,
    "buyerSupplierId" TEXT,
    "sellerSupplierId" TEXT NOT NULL,
    "journeyId" TEXT,
    "purchaseOrderExecutionId" TEXT,
    "orderNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "currencyCode" TEXT NOT NULL,
    "totalAmount" DECIMAL(18,4) NOT NULL,
    "lineSnapshot" JSONB NOT NULL,
    "buyerRequesterUserId" TEXT,
    "buyerTenantName" TEXT,
    "acceptedByUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "expectedDeliveryAt" TIMESTAMP(3),
    "shippedByUserId" TEXT,
    "shippedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceSellerOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketplaceSellerOrder_purchaseRequestId_sellerTenantId_key"
ON "MarketplaceSellerOrder"("purchaseRequestId", "sellerTenantId");
CREATE INDEX "MarketplaceSellerOrder_sellerTenantId_status_createdAt_idx"
ON "MarketplaceSellerOrder"("sellerTenantId", "status", "createdAt");
CREATE INDEX "MarketplaceSellerOrder_buyerTenantId_status_createdAt_idx"
ON "MarketplaceSellerOrder"("buyerTenantId", "status", "createdAt");
