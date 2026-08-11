-- Align database index names with explicit Prisma mappings.
ALTER INDEX IF EXISTS "MarketplacePurchaseRequestLineBinding_tenantId_purchaseRequestI"
  RENAME TO "MktPRLineBinding_tenant_request_idx";

ALTER INDEX IF EXISTS "MarketplacePurchaseRequestLineBinding_sellerTenantId_createdAt_"
  RENAME TO "MktPRLineBinding_seller_created_idx";

ALTER INDEX IF EXISTS "SupplierMarketplaceOfferingMedia_tenantId_offeringId_position_i"
  RENAME TO "MktOfferingMedia_tenant_offer_pos_idx";
