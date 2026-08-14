ALTER TABLE "SupplierMarketplaceOffering"
ADD COLUMN "availableSizes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "MarketplacePurchaseRequestLineBinding"
ADD COLUMN "selectedSize" TEXT;
