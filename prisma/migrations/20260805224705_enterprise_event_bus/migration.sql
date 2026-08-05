-- CreateEnum
CREATE TYPE "PlatformEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "PlatformEventSubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "PlatformEventDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "PlatformEventDeliveryType" AS ENUM ('INTERNAL_HANDLER', 'WEBHOOK', 'BACKGROUND_JOB');

-- CreateTable
CREATE TABLE "PlatformEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tenantId" TEXT,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT,
    "aggregateId" TEXT,
    "sourceModule" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "status" "PlatformEventStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "correlationId" TEXT,
    "causationId" TEXT,
    "actorUserId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformEventSubscription" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PlatformEventSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "eventTypePattern" TEXT NOT NULL,
    "deliveryType" "PlatformEventDeliveryType" NOT NULL,
    "handlerKey" TEXT,
    "webhookUrl" TEXT,
    "backgroundJobKey" TEXT,
    "tenantId" TEXT,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "retryDelaySeconds" INTEGER NOT NULL DEFAULT 300,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformEventSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformEventDelivery" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "status" "PlatformEventDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "errorMessage" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformEventDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformEvent_eventId_key" ON "PlatformEvent"("eventId");

-- CreateIndex
CREATE INDEX "PlatformEvent_status_availableAt_idx" ON "PlatformEvent"("status", "availableAt");

-- CreateIndex
CREATE INDEX "PlatformEvent_tenantId_eventType_occurredAt_idx" ON "PlatformEvent"("tenantId", "eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "PlatformEvent_aggregateType_aggregateId_idx" ON "PlatformEvent"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "PlatformEvent_correlationId_idx" ON "PlatformEvent"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformEventSubscription_key_key" ON "PlatformEventSubscription"("key");

-- CreateIndex
CREATE INDEX "PlatformEventSubscription_status_eventTypePattern_idx" ON "PlatformEventSubscription"("status", "eventTypePattern");

-- CreateIndex
CREATE INDEX "PlatformEventSubscription_tenantId_status_idx" ON "PlatformEventSubscription"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PlatformEventDelivery_status_availableAt_idx" ON "PlatformEventDelivery"("status", "availableAt");

-- CreateIndex
CREATE INDEX "PlatformEventDelivery_subscriptionId_status_idx" ON "PlatformEventDelivery"("subscriptionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformEventDelivery_eventId_subscriptionId_key" ON "PlatformEventDelivery"("eventId", "subscriptionId");

-- AddForeignKey
ALTER TABLE "PlatformEvent" ADD CONSTRAINT "PlatformEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformEventSubscription" ADD CONSTRAINT "PlatformEventSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformEventDelivery" ADD CONSTRAINT "PlatformEventDelivery_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PlatformEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformEventDelivery" ADD CONSTRAINT "PlatformEventDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "PlatformEventSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
