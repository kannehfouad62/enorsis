-- CreateEnum
CREATE TYPE "ProcurementCatalogStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ProcurementCatalogType" AS ENUM ('INTERNAL', 'SUPPLIER', 'CONTRACT', 'PUNCHOUT');

-- CreateEnum
CREATE TYPE "CatalogItemStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "GuidedCartStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CONVERTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ProcurementCatalog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ProcurementCatalogType" NOT NULL,
    "status" "ProcurementCatalogStatus" NOT NULL DEFAULT 'DRAFT',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "contractReference" TEXT,
    "punchoutUrl" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "activatedByUserId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementCatalogItem" (
    "id" TEXT NOT NULL,
    "procurementCatalogId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "supplierSku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "status" "CatalogItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "unitOfMeasure" TEXT NOT NULL,
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "minimumQuantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "maximumQuantity" DECIMAL(18,4),
    "leadTimeDays" INTEGER,
    "manufacturer" TEXT,
    "manufacturerPartNo" TEXT,
    "preferred" BOOLEAN NOT NULL DEFAULT false,
    "environmentallyPreferred" BOOLEAN NOT NULL DEFAULT false,
    "diversityQualified" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "specifications" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidedCart" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requesterUserId" TEXT NOT NULL,
    "name" TEXT,
    "status" "GuidedCartStatus" NOT NULL DEFAULT 'DRAFT',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "businessPurpose" TEXT,
    "deliveryLocation" TEXT,
    "neededBy" TIMESTAMP(3),
    "purchaseRequestId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuidedCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidedCartItem" (
    "id" TEXT NOT NULL,
    "guidedCartId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuidedCartItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcurementCatalog_tenantId_status_type_idx" ON "ProcurementCatalog"("tenantId", "status", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementCatalog_tenantId_name_key" ON "ProcurementCatalog"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ProcurementCatalogItem_procurementCatalogId_status_category_idx" ON "ProcurementCatalogItem"("procurementCatalogId", "status", "category");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementCatalogItem_procurementCatalogId_sku_key" ON "ProcurementCatalogItem"("procurementCatalogId", "sku");

-- CreateIndex
CREATE INDEX "GuidedCart_tenantId_requesterUserId_status_idx" ON "GuidedCart"("tenantId", "requesterUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GuidedCartItem_guidedCartId_catalogItemId_key" ON "GuidedCartItem"("guidedCartId", "catalogItemId");

-- AddForeignKey
ALTER TABLE "ProcurementCatalog" ADD CONSTRAINT "ProcurementCatalog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementCatalog" ADD CONSTRAINT "ProcurementCatalog_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementCatalogItem" ADD CONSTRAINT "ProcurementCatalogItem_procurementCatalogId_fkey" FOREIGN KEY ("procurementCatalogId") REFERENCES "ProcurementCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidedCart" ADD CONSTRAINT "GuidedCart_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidedCartItem" ADD CONSTRAINT "GuidedCartItem_guidedCartId_fkey" FOREIGN KEY ("guidedCartId") REFERENCES "GuidedCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidedCartItem" ADD CONSTRAINT "GuidedCartItem_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "ProcurementCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
