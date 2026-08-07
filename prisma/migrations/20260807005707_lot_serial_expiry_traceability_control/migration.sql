-- CreateEnum
CREATE TYPE "InventoryTraceUnitType" AS ENUM ('LOT', 'SERIAL');

-- CreateEnum
CREATE TYPE "InventoryTraceUnitStatus" AS ENUM ('ACTIVE', 'QUARANTINED', 'EXPIRED', 'RECALLED', 'CONSUMED', 'SCRAPPED', 'CLOSED');

-- CreateEnum
CREATE TYPE "InventoryTraceEventType" AS ENUM ('CREATED', 'RECEIVED', 'PUTAWAY', 'TRANSFERRED', 'RESERVED', 'PICKED', 'ISSUED', 'ADJUSTED', 'QUARANTINED', 'RELEASED', 'RECALLED', 'EXPIRED', 'SCRAPPED', 'COUNTED');

-- CreateEnum
CREATE TYPE "InventoryTraceHoldStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryTraceHoldType" AS ENUM ('QUALITY', 'EXPIRY', 'RECALL', 'COMPLIANCE', 'INVESTIGATION', 'OTHER');

-- CreateTable
CREATE TABLE "InventoryTraceUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "traceNumber" TEXT NOT NULL,
    "unitType" "InventoryTraceUnitType" NOT NULL,
    "status" "InventoryTraceUnitStatus" NOT NULL DEFAULT 'ACTIVE',
    "inventoryItemId" TEXT NOT NULL,
    "lotNumber" TEXT,
    "serialNumber" TEXT,
    "currentLocationId" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
    "manufactureDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "supplierId" TEXT,
    "sourceReferenceType" TEXT,
    "sourceReferenceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTraceUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTraceEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "traceUnitId" TEXT NOT NULL,
    "eventType" "InventoryTraceEventType" NOT NULL,
    "movementLedgerId" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "quantity" DECIMAL(18,4),
    "eventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTraceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTraceHold" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "traceUnitId" TEXT NOT NULL,
    "holdType" "InventoryTraceHoldType" NOT NULL,
    "status" "InventoryTraceHoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerUserId" TEXT,
    "releasedByUserId" TEXT,
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTraceHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryTraceUnit_tenantId_status_expiryDate_idx" ON "InventoryTraceUnit"("tenantId", "status", "expiryDate");

-- CreateIndex
CREATE INDEX "InventoryTraceUnit_inventoryItemId_lotNumber_idx" ON "InventoryTraceUnit"("inventoryItemId", "lotNumber");

-- CreateIndex
CREATE INDEX "InventoryTraceUnit_currentLocationId_idx" ON "InventoryTraceUnit"("currentLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTraceUnit_tenantId_traceNumber_key" ON "InventoryTraceUnit"("tenantId", "traceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTraceUnit_tenantId_inventoryItemId_serialNumber_key" ON "InventoryTraceUnit"("tenantId", "inventoryItemId", "serialNumber");

-- CreateIndex
CREATE INDEX "InventoryTraceEvent_tenantId_eventAt_idx" ON "InventoryTraceEvent"("tenantId", "eventAt");

-- CreateIndex
CREATE INDEX "InventoryTraceEvent_traceUnitId_eventAt_idx" ON "InventoryTraceEvent"("traceUnitId", "eventAt");

-- CreateIndex
CREATE INDEX "InventoryTraceEvent_movementLedgerId_idx" ON "InventoryTraceEvent"("movementLedgerId");

-- CreateIndex
CREATE INDEX "InventoryTraceEvent_referenceType_referenceId_idx" ON "InventoryTraceEvent"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "InventoryTraceHold_tenantId_status_holdType_idx" ON "InventoryTraceHold"("tenantId", "status", "holdType");

-- CreateIndex
CREATE INDEX "InventoryTraceHold_traceUnitId_status_idx" ON "InventoryTraceHold"("traceUnitId", "status");

-- AddForeignKey
ALTER TABLE "InventoryTraceUnit" ADD CONSTRAINT "InventoryTraceUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTraceEvent" ADD CONSTRAINT "InventoryTraceEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTraceEvent" ADD CONSTRAINT "InventoryTraceEvent_traceUnitId_fkey" FOREIGN KEY ("traceUnitId") REFERENCES "InventoryTraceUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTraceHold" ADD CONSTRAINT "InventoryTraceHold_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTraceHold" ADD CONSTRAINT "InventoryTraceHold_traceUnitId_fkey" FOREIGN KEY ("traceUnitId") REFERENCES "InventoryTraceUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
