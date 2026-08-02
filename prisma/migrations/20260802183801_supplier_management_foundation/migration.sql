-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('PROSPECT', 'INVITED', 'IN_REVIEW', 'APPROVED', 'SUSPENDED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SupplierRiskTier" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SupplierQualificationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'QUALIFIED', 'CONDITIONALLY_QUALIFIED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "SupplierDocumentType" AS ENUM ('TAX', 'INSURANCE', 'CERTIFICATION', 'LICENSE', 'ESG', 'FINANCIAL', 'OTHER');

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierNumber" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradingName" TEXT,
    "countryCode" TEXT NOT NULL,
    "taxIdentificationNo" TEXT,
    "website" TEXT,
    "primaryEmail" TEXT,
    "primaryPhone" TEXT,
    "categories" TEXT[],
    "status" "SupplierStatus" NOT NULL DEFAULT 'PROSPECT',
    "riskTier" "SupplierRiskTier" NOT NULL DEFAULT 'MODERATE',
    "qualificationStatus" "SupplierQualificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "diversityOwned" BOOLEAN NOT NULL DEFAULT false,
    "esgCommitted" BOOLEAN NOT NULL DEFAULT false,
    "sanctionsScreenedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierContact" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierDocument" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "type" "SupplierDocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "storageUrl" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_tenantId_status_idx" ON "Supplier"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_riskTier_idx" ON "Supplier"("tenantId", "riskTier");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_qualificationStatus_idx" ON "Supplier"("tenantId", "qualificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_tenantId_supplierNumber_key" ON "Supplier"("tenantId", "supplierNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_tenantId_legalName_countryCode_key" ON "Supplier"("tenantId", "legalName", "countryCode");

-- CreateIndex
CREATE INDEX "SupplierContact_supplierId_idx" ON "SupplierContact"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierDocument_supplierId_type_idx" ON "SupplierDocument"("supplierId", "type");

-- CreateIndex
CREATE INDEX "SupplierDocument_expiresAt_idx" ON "SupplierDocument"("expiresAt");

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierContact" ADD CONSTRAINT "SupplierContact_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDocument" ADD CONSTRAINT "SupplierDocument_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
