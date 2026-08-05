-- CreateEnum
CREATE TYPE "LogisticsShipmentStatus" AS ENUM ('PLANNED', 'BOOKED', 'IN_TRANSIT', 'DELAYED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LogisticsTransportMode" AS ENUM ('ROAD', 'AIR', 'OCEAN', 'RAIL', 'COURIER', 'MULTIMODAL');

-- CreateEnum
CREATE TYPE "LogisticsEventType" AS ENUM ('BOOKED', 'PICKED_UP', 'DEPARTED', 'ARRIVED', 'CUSTOMS_HOLD', 'DELAYED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION');

-- CreateTable
CREATE TABLE "LogisticsCarrier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "scacCode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsCarrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsShipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "supplierId" TEXT,
    "carrierId" TEXT,
    "mode" "LogisticsTransportMode" NOT NULL,
    "status" "LogisticsShipmentStatus" NOT NULL DEFAULT 'PLANNED',
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "incoterm" TEXT,
    "bookedAt" TIMESTAMP(3),
    "pickupAt" TIMESTAMP(3),
    "estimatedDeliveryAt" TIMESTAMP(3),
    "actualDeliveryAt" TIMESTAMP(3),
    "freightCost" DECIMAL(18,2),
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "weight" DECIMAL(18,4),
    "weightUnit" TEXT,
    "packageCount" INTEGER NOT NULL DEFAULT 0,
    "delayRiskPercent" INTEGER NOT NULL DEFAULT 0,
    "exceptionSummary" TEXT,
    "proofOfDeliveryUrl" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsTrackingEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "type" "LogisticsEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "source" TEXT,
    "evidenceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogisticsTrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogisticsCarrier_tenantId_active_name_idx" ON "LogisticsCarrier"("tenantId", "active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsCarrier_tenantId_code_key" ON "LogisticsCarrier"("tenantId", "code");

-- CreateIndex
CREATE INDEX "LogisticsShipment_tenantId_status_estimatedDeliveryAt_idx" ON "LogisticsShipment"("tenantId", "status", "estimatedDeliveryAt");

-- CreateIndex
CREATE INDEX "LogisticsShipment_trackingNumber_idx" ON "LogisticsShipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "LogisticsShipment_supplierId_status_idx" ON "LogisticsShipment"("supplierId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsShipment_tenantId_shipmentNumber_key" ON "LogisticsShipment"("tenantId", "shipmentNumber");

-- CreateIndex
CREATE INDEX "LogisticsTrackingEvent_shipmentId_occurredAt_idx" ON "LogisticsTrackingEvent"("shipmentId", "occurredAt");

-- AddForeignKey
ALTER TABLE "LogisticsCarrier" ADD CONSTRAINT "LogisticsCarrier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsShipment" ADD CONSTRAINT "LogisticsShipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsShipment" ADD CONSTRAINT "LogisticsShipment_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "LogisticsCarrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsTrackingEvent" ADD CONSTRAINT "LogisticsTrackingEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "LogisticsShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
