CREATE TYPE "TenantCommercialPersona" AS ENUM (
  'BUYER',
  'SUPPLIER',
  'BUYER_SUPPLIER'
);

ALTER TABLE "Tenant"
ADD COLUMN "commercialPersona" "TenantCommercialPersona" NOT NULL DEFAULT 'BUYER';

CREATE INDEX "Tenant_commercialPersona_idx"
ON "Tenant"("commercialPersona");
