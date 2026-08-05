-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('PLANNED', 'IN_SERVICE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED', 'DISPOSED', 'LOST');

-- CreateEnum
CREATE TYPE "AssetCriticality" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AssetMaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'CALIBRATION', 'WARRANTY', 'UPGRADE');

-- CreateEnum
CREATE TYPE "AssetMaintenanceStatus" AS ENUM ('PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "AssetAssignmentStatus" AS ENUM ('ACTIVE', 'RETURNED', 'TRANSFERRED', 'LOST');

-- CreateTable
CREATE TABLE "ProcurementAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'PLANNED',
    "criticality" "AssetCriticality" NOT NULL DEFAULT 'MODERATE',
    "serialNumber" TEXT,
    "manufacturer" TEXT,
    "modelNumber" TEXT,
    "purchaseOrderId" TEXT,
    "supplierId" TEXT,
    "inventoryItemId" TEXT,
    "siteId" TEXT,
    "location" TEXT,
    "acquisitionDate" TIMESTAMP(3),
    "inServiceDate" TIMESTAMP(3),
    "purchaseCost" DECIMAL(18,2),
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "capitalizationDate" TIMESTAMP(3),
    "usefulLifeMonths" INTEGER,
    "residualValue" DECIMAL(18,2),
    "warrantyStartsAt" TIMESTAMP(3),
    "warrantyEndsAt" TIMESTAMP(3),
    "warrantyProvider" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "custodianUserId" TEXT,
    "retiredAt" TIMESTAMP(3),
    "retirementReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAssignment" (
    "id" TEXT NOT NULL,
    "procurementAssetId" TEXT NOT NULL,
    "assignedToUserId" TEXT NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedReturnAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "status" "AssetAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "location" TEXT,
    "conditionAtIssue" TEXT,
    "conditionAtReturn" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetMaintenancePlan" (
    "id" TEXT NOT NULL,
    "procurementAssetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetMaintenanceType" NOT NULL,
    "frequencyDays" INTEGER NOT NULL,
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "responsibleUserId" TEXT NOT NULL,
    "instructions" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetMaintenancePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetMaintenanceRecord" (
    "id" TEXT NOT NULL,
    "procurementAssetId" TEXT NOT NULL,
    "maintenancePlanId" TEXT,
    "type" "AssetMaintenanceType" NOT NULL,
    "status" "AssetMaintenanceStatus" NOT NULL DEFAULT 'PLANNED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "performedBy" TEXT,
    "vendorName" TEXT,
    "cost" DECIMAL(18,2),
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "findings" TEXT,
    "workPerformed" TEXT,
    "partsUsed" TEXT,
    "downtimeHours" DECIMAL(10,2),
    "evidenceUrl" TEXT,
    "approvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetMaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcurementAsset_tenantId_status_category_idx" ON "ProcurementAsset"("tenantId", "status", "category");

-- CreateIndex
CREATE INDEX "ProcurementAsset_serialNumber_idx" ON "ProcurementAsset"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementAsset_tenantId_assetNumber_key" ON "ProcurementAsset"("tenantId", "assetNumber");

-- CreateIndex
CREATE INDEX "AssetAssignment_procurementAssetId_status_idx" ON "AssetAssignment"("procurementAssetId", "status");

-- CreateIndex
CREATE INDEX "AssetAssignment_assignedToUserId_status_idx" ON "AssetAssignment"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "AssetMaintenancePlan_procurementAssetId_active_nextDueAt_idx" ON "AssetMaintenancePlan"("procurementAssetId", "active", "nextDueAt");

-- CreateIndex
CREATE INDEX "AssetMaintenanceRecord_procurementAssetId_status_scheduledA_idx" ON "AssetMaintenanceRecord"("procurementAssetId", "status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "ProcurementAsset" ADD CONSTRAINT "ProcurementAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_procurementAssetId_fkey" FOREIGN KEY ("procurementAssetId") REFERENCES "ProcurementAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMaintenancePlan" ADD CONSTRAINT "AssetMaintenancePlan_procurementAssetId_fkey" FOREIGN KEY ("procurementAssetId") REFERENCES "ProcurementAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMaintenanceRecord" ADD CONSTRAINT "AssetMaintenanceRecord_procurementAssetId_fkey" FOREIGN KEY ("procurementAssetId") REFERENCES "ProcurementAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMaintenanceRecord" ADD CONSTRAINT "AssetMaintenanceRecord_maintenancePlanId_fkey" FOREIGN KEY ("maintenancePlanId") REFERENCES "AssetMaintenancePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
