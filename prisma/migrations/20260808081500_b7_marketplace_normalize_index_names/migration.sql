-- Normalize PostgreSQL index names to Prisma-generated names.
-- Structural indexes already exist; this migration renames them only.

ALTER INDEX "SupplierMarketplaceOffering_tenantId_category_availabilityStatu"
RENAME TO "SupplierMarketplaceOffering_tenantId_category_availabilityS_idx";

ALTER INDEX "SupplierMarketplaceOffering_tenantId_marketplaceVisible_offerin"
RENAME TO "SupplierMarketplaceOffering_tenantId_marketplaceVisible_off_idx";

ALTER INDEX "SupplierMarketplaceProfile_tenantId_marketplaceVisible_verifica"
RENAME TO "SupplierMarketplaceProfile_tenantId_marketplaceVisible_veri_idx";
