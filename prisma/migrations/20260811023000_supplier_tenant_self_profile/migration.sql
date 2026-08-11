ALTER TABLE "Supplier"
ADD COLUMN "isTenantSelfProfile" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Supplier_tenantId_isTenantSelfProfile_idx"
ON "Supplier"("tenantId", "isTenantSelfProfile");
