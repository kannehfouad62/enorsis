-- CreateEnum
CREATE TYPE "EnterpriseNotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'MOBILE_PUSH', 'SMS', 'MICROSOFT_TEAMS', 'SLACK', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "EnterpriseNotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "EnterpriseNotificationStatus" AS ENUM ('QUEUED', 'PROCESSING', 'DELIVERED', 'PARTIALLY_DELIVERED', 'FAILED', 'CANCELLED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "EnterpriseNotificationDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'SKIPPED', 'DEAD_LETTER');

-- CreateTable
CREATE TABLE "EnterpriseNotificationTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "eventType" TEXT,
    "channel" "EnterpriseNotificationChannel" NOT NULL,
    "subjectTemplate" TEXT,
    "bodyTemplate" TEXT NOT NULL,
    "actionUrlTemplate" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseNotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseNotificationPreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "channel" "EnterpriseNotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "digestOnly" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" INTEGER,
    "quietHoursEnd" INTEGER,
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseNotification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT,
    "eventId" TEXT,
    "eventType" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "recipientAddress" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "priority" "EnterpriseNotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "EnterpriseNotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "data" JSONB,
    "correlationId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseNotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" "EnterpriseNotificationChannel" NOT NULL,
    "status" "EnterpriseNotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "destination" TEXT,
    "provider" TEXT,
    "providerMessageId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "responseMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseNotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnterpriseNotificationTemplate_eventType_channel_active_idx" ON "EnterpriseNotificationTemplate"("eventType", "channel", "active");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseNotificationTemplate_tenantId_key_channel_locale__key" ON "EnterpriseNotificationTemplate"("tenantId", "key", "channel", "locale", "version");

-- CreateIndex
CREATE INDEX "EnterpriseNotificationPreference_userId_enabled_idx" ON "EnterpriseNotificationPreference"("userId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseNotificationPreference_tenantId_userId_eventType__key" ON "EnterpriseNotificationPreference"("tenantId", "userId", "eventType", "channel");

-- CreateIndex
CREATE INDEX "EnterpriseNotification_tenantId_recipientUserId_readAt_idx" ON "EnterpriseNotification"("tenantId", "recipientUserId", "readAt");

-- CreateIndex
CREATE INDEX "EnterpriseNotification_status_scheduledAt_idx" ON "EnterpriseNotification"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "EnterpriseNotification_eventType_createdAt_idx" ON "EnterpriseNotification"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "EnterpriseNotification_correlationId_idx" ON "EnterpriseNotification"("correlationId");

-- CreateIndex
CREATE INDEX "EnterpriseNotificationDelivery_status_availableAt_idx" ON "EnterpriseNotificationDelivery"("status", "availableAt");

-- CreateIndex
CREATE INDEX "EnterpriseNotificationDelivery_notificationId_channel_idx" ON "EnterpriseNotificationDelivery"("notificationId", "channel");

-- AddForeignKey
ALTER TABLE "EnterpriseNotificationTemplate" ADD CONSTRAINT "EnterpriseNotificationTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseNotificationPreference" ADD CONSTRAINT "EnterpriseNotificationPreference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseNotification" ADD CONSTRAINT "EnterpriseNotification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseNotification" ADD CONSTRAINT "EnterpriseNotification_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EnterpriseNotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseNotificationDelivery" ADD CONSTRAINT "EnterpriseNotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "EnterpriseNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
