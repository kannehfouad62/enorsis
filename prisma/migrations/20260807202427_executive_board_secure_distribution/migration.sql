-- CreateEnum
CREATE TYPE "ExecutiveBoardRecipientGroupType" AS ENUM ('BOARD', 'AUDIT_COMMITTEE', 'RISK_COMMITTEE', 'PROCUREMENT_COMMITTEE', 'FINANCE_COMMITTEE', 'EXECUTIVE_LEADERSHIP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ExecutiveBoardRecipientStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ExecutiveBoardDistributionStatus" AS ENUM ('PENDING', 'SENT', 'PARTIALLY_SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExecutiveBoardDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'OPENED', 'FAILED', 'REVOKED');

-- CreateTable
CREATE TABLE "ExecutiveBoardRecipientGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "groupType" "ExecutiveBoardRecipientGroupType" NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutiveBoardRecipientGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutiveBoardRecipient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "title" TEXT,
    "organization" TEXT,
    "status" "ExecutiveBoardRecipientStatus" NOT NULL DEFAULT 'ACTIVE',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutiveBoardRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutiveBoardDistribution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "boardPackId" TEXT NOT NULL,
    "recipientGroupId" TEXT NOT NULL,
    "distributionNumber" TEXT NOT NULL,
    "status" "ExecutiveBoardDistributionStatus" NOT NULL DEFAULT 'PENDING',
    "subject" TEXT NOT NULL,
    "message" TEXT,
    "initiatedByUserId" TEXT NOT NULL,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutiveBoardDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutiveBoardDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "status" "ExecutiveBoardDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "accessTokenHash" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutiveBoardDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutiveBoardDeliveryAccessEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutiveBoardDeliveryAccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExecutiveBoardRecipientGroup_tenantId_groupType_active_idx" ON "ExecutiveBoardRecipientGroup"("tenantId", "groupType", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutiveBoardRecipientGroup_tenantId_name_key" ON "ExecutiveBoardRecipientGroup"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ExecutiveBoardRecipient_tenantId_status_idx" ON "ExecutiveBoardRecipient"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ExecutiveBoardRecipient_email_idx" ON "ExecutiveBoardRecipient"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutiveBoardRecipient_groupId_email_key" ON "ExecutiveBoardRecipient"("groupId", "email");

-- CreateIndex
CREATE INDEX "ExecutiveBoardDistribution_tenantId_status_initiatedAt_idx" ON "ExecutiveBoardDistribution"("tenantId", "status", "initiatedAt");

-- CreateIndex
CREATE INDEX "ExecutiveBoardDistribution_boardPackId_initiatedAt_idx" ON "ExecutiveBoardDistribution"("boardPackId", "initiatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutiveBoardDistribution_tenantId_distributionNumber_key" ON "ExecutiveBoardDistribution"("tenantId", "distributionNumber");

-- CreateIndex
CREATE INDEX "ExecutiveBoardDelivery_tenantId_status_createdAt_idx" ON "ExecutiveBoardDelivery"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ExecutiveBoardDelivery_recipientId_createdAt_idx" ON "ExecutiveBoardDelivery"("recipientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutiveBoardDelivery_distributionId_recipientId_key" ON "ExecutiveBoardDelivery"("distributionId", "recipientId");

-- CreateIndex
CREATE INDEX "ExecutiveBoardDeliveryAccessEvent_tenantId_occurredAt_idx" ON "ExecutiveBoardDeliveryAccessEvent"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "ExecutiveBoardDeliveryAccessEvent_deliveryId_occurredAt_idx" ON "ExecutiveBoardDeliveryAccessEvent"("deliveryId", "occurredAt");

-- AddForeignKey
ALTER TABLE "ExecutiveBoardRecipientGroup" ADD CONSTRAINT "ExecutiveBoardRecipientGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveBoardRecipient" ADD CONSTRAINT "ExecutiveBoardRecipient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveBoardRecipient" ADD CONSTRAINT "ExecutiveBoardRecipient_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ExecutiveBoardRecipientGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveBoardDistribution" ADD CONSTRAINT "ExecutiveBoardDistribution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveBoardDistribution" ADD CONSTRAINT "ExecutiveBoardDistribution_boardPackId_fkey" FOREIGN KEY ("boardPackId") REFERENCES "ExecutiveBoardPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveBoardDistribution" ADD CONSTRAINT "ExecutiveBoardDistribution_recipientGroupId_fkey" FOREIGN KEY ("recipientGroupId") REFERENCES "ExecutiveBoardRecipientGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveBoardDelivery" ADD CONSTRAINT "ExecutiveBoardDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveBoardDelivery" ADD CONSTRAINT "ExecutiveBoardDelivery_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "ExecutiveBoardDistribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveBoardDelivery" ADD CONSTRAINT "ExecutiveBoardDelivery_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "ExecutiveBoardRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveBoardDeliveryAccessEvent" ADD CONSTRAINT "ExecutiveBoardDeliveryAccessEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveBoardDeliveryAccessEvent" ADD CONSTRAINT "ExecutiveBoardDeliveryAccessEvent_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "ExecutiveBoardDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
