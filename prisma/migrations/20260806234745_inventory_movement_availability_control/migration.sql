-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('RECEIPT', 'ISSUE', 'TRANSFER', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RETURN', 'SCRAP', 'CYCLE_COUNT');

-- CreateEnum
CREATE TYPE "InventoryMovementStatus" AS ENUM ('DRAFT', 'POSTED', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "InventoryReservationStatus" AS ENUM ('ACTIVE', 'PARTIALLY_FULFILLED', 'FULFILLED', 'RELEASED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryOperationExceptionStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'WAIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryOperationExceptionType" AS ENUM ('NEGATIVE_STOCK', 'INSUFFICIENT_AVAILABILITY', 'LOCATION_MISMATCH', 'ITEM_MISMATCH', 'QUANTITY_VARIANCE', 'SERIAL_LOT_REQUIRED', 'EXPIRED_STOCK', 'DAMAGED_STOCK', 'OTHER');

-- CreateTable
CREATE TABLE "InventoryMovementLedger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "movementNumber" TEXT NOT NULL,
    "movementType" "InventoryMovementType" NOT NULL,
    "status" "InventoryMovementStatus" NOT NULL DEFAULT 'DRAFT',
    "inventoryItemId" TEXT NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitOfMeasure" TEXT NOT NULL DEFAULT 'EA',
    "unitCost" DECIMAL(18,4),
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "referenceType" TEXT,
    "referenceId" TEXT,
    "serialLotReference" TEXT,
    "reason" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedAt" TIMESTAMP(3),
    "postedByUserId" TEXT,
    "createdByUserId" TEXT,
    "reversalOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryMovementLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAvailabilitySnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "onHandQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "reservedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "availableQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "inTransitQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "damagedQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "lastMovementAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryAvailabilitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reservationNumber" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "requestedQuantity" DECIMAL(18,4) NOT NULL,
    "fulfilledQuantity" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "status" "InventoryReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "referenceType" TEXT,
    "referenceId" TEXT,
    "requiredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "requestedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryOperationException" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "movementLedgerId" TEXT,
    "exceptionType" "InventoryOperationExceptionType" NOT NULL,
    "status" "InventoryOperationExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "RequisitionOrderExceptionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ownerUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryOperationException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryMovementLedger_tenantId_status_occurredAt_idx" ON "InventoryMovementLedger"("tenantId", "status", "occurredAt");

-- CreateIndex
CREATE INDEX "InventoryMovementLedger_inventoryItemId_idx" ON "InventoryMovementLedger"("inventoryItemId");

-- CreateIndex
CREATE INDEX "InventoryMovementLedger_fromLocationId_idx" ON "InventoryMovementLedger"("fromLocationId");

-- CreateIndex
CREATE INDEX "InventoryMovementLedger_toLocationId_idx" ON "InventoryMovementLedger"("toLocationId");

-- CreateIndex
CREATE INDEX "InventoryMovementLedger_referenceType_referenceId_idx" ON "InventoryMovementLedger"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovementLedger_tenantId_movementNumber_key" ON "InventoryMovementLedger"("tenantId", "movementNumber");

-- CreateIndex
CREATE INDEX "InventoryAvailabilitySnapshot_tenantId_locationId_idx" ON "InventoryAvailabilitySnapshot"("tenantId", "locationId");

-- CreateIndex
CREATE INDEX "InventoryAvailabilitySnapshot_inventoryItemId_idx" ON "InventoryAvailabilitySnapshot"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryAvailabilitySnapshot_tenantId_inventoryItemId_loca_key" ON "InventoryAvailabilitySnapshot"("tenantId", "inventoryItemId", "locationId");

-- CreateIndex
CREATE INDEX "InventoryReservation_tenantId_status_requiredAt_idx" ON "InventoryReservation"("tenantId", "status", "requiredAt");

-- CreateIndex
CREATE INDEX "InventoryReservation_inventoryItemId_locationId_idx" ON "InventoryReservation"("inventoryItemId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryReservation_tenantId_reservationNumber_key" ON "InventoryReservation"("tenantId", "reservationNumber");

-- CreateIndex
CREATE INDEX "InventoryOperationException_tenantId_status_severity_idx" ON "InventoryOperationException"("tenantId", "status", "severity");

-- CreateIndex
CREATE INDEX "InventoryOperationException_movementLedgerId_idx" ON "InventoryOperationException"("movementLedgerId");

-- AddForeignKey
ALTER TABLE "InventoryMovementLedger" ADD CONSTRAINT "InventoryMovementLedger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAvailabilitySnapshot" ADD CONSTRAINT "InventoryAvailabilitySnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryOperationException" ADD CONSTRAINT "InventoryOperationException_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryOperationException" ADD CONSTRAINT "InventoryOperationException_movementLedgerId_fkey" FOREIGN KEY ("movementLedgerId") REFERENCES "InventoryMovementLedger"("id") ON DELETE CASCADE ON UPDATE CASCADE;
