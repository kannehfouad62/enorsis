-- CreateEnum
CREATE TYPE "RequisitionOrderJourneyStatus" AS ENUM ('DRAFT', 'REQUISITION_SUBMITTED', 'APPROVAL_PENDING', 'APPROVED', 'ORDER_PENDING', 'ORDER_ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "RequisitionOrderMilestoneType" AS ENUM ('REQUISITION_CREATED', 'REQUISITION_SUBMITTED', 'APPROVAL_REQUESTED', 'APPROVAL_COMPLETED', 'ORDER_CREATED', 'ORDER_ISSUED', 'RECEIPT_RECORDED', 'EXCEPTION_RAISED', 'EXCEPTION_RESOLVED', 'JOURNEY_CLOSED', 'JOURNEY_CANCELLED');

-- CreateEnum
CREATE TYPE "RequisitionOrderExceptionStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'WAIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequisitionOrderExceptionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "RequisitionOrderJourney" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "journeyNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "RequisitionOrderJourneyStatus" NOT NULL DEFAULT 'DRAFT',
    "requesterUserId" TEXT,
    "ownerUserId" TEXT,
    "purchaseRequestId" TEXT,
    "purchaseOrderId" TEXT,
    "primaryReceiptId" TEXT,
    "supplierId" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "estimatedAmount" DECIMAL(18,2),
    "committedAmount" DECIMAL(18,2),
    "receivedAmount" DECIMAL(18,2),
    "requiredByDate" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "orderedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequisitionOrderJourney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequisitionOrderMilestone" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "milestoneType" "RequisitionOrderMilestoneType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "actorUserId" TEXT,
    "sourceModule" TEXT,
    "sourceRecordId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequisitionOrderMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequisitionOrderException" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "RequisitionOrderExceptionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "RequisitionOrderExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "ownerUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "sourceModule" TEXT,
    "sourceRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequisitionOrderException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequisitionOrderJourney_tenantId_status_createdAt_idx" ON "RequisitionOrderJourney"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RequisitionOrderJourney_purchaseRequestId_idx" ON "RequisitionOrderJourney"("purchaseRequestId");

-- CreateIndex
CREATE INDEX "RequisitionOrderJourney_purchaseOrderId_idx" ON "RequisitionOrderJourney"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "RequisitionOrderJourney_supplierId_idx" ON "RequisitionOrderJourney"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "RequisitionOrderJourney_tenantId_journeyNumber_key" ON "RequisitionOrderJourney"("tenantId", "journeyNumber");

-- CreateIndex
CREATE INDEX "RequisitionOrderMilestone_journeyId_occurredAt_idx" ON "RequisitionOrderMilestone"("journeyId", "occurredAt");

-- CreateIndex
CREATE INDEX "RequisitionOrderMilestone_milestoneType_occurredAt_idx" ON "RequisitionOrderMilestone"("milestoneType", "occurredAt");

-- CreateIndex
CREATE INDEX "RequisitionOrderException_journeyId_status_severity_idx" ON "RequisitionOrderException"("journeyId", "status", "severity");

-- CreateIndex
CREATE INDEX "RequisitionOrderException_status_dueAt_idx" ON "RequisitionOrderException"("status", "dueAt");

-- AddForeignKey
ALTER TABLE "RequisitionOrderJourney" ADD CONSTRAINT "RequisitionOrderJourney_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionOrderMilestone" ADD CONSTRAINT "RequisitionOrderMilestone_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "RequisitionOrderJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionOrderException" ADD CONSTRAINT "RequisitionOrderException_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "RequisitionOrderJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;
