-- CreateEnum
CREATE TYPE "SourcingEventType" AS ENUM ('RFI', 'RFQ', 'RFP');

-- CreateEnum
CREATE TYPE "SourcingEventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'OPEN', 'EVALUATION', 'AWARDED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SourcingInvitationStatus" AS ENUM ('INVITED', 'VIEWED', 'DECLINED', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "SourcingResponseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "SourcingCriterionType" AS ENUM ('TECHNICAL', 'COMMERCIAL', 'RISK', 'ESG', 'DELIVERY', 'OTHER');

-- CreateTable
CREATE TABLE "SourcingEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventNumber" TEXT NOT NULL,
    "type" "SourcingEventType" NOT NULL,
    "status" "SourcingEventStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "scopeOfWork" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "estimatedValue" DECIMAL(18,2),
    "responseDeadline" TIMESTAMP(3),
    "sealedResponses" BOOLEAN NOT NULL DEFAULT true,
    "allowMultipleRounds" BOOLEAN NOT NULL DEFAULT false,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "awardedAt" TIMESTAMP(3),
    "awardedSupplierId" TEXT,
    "awardRecommendation" TEXT,
    "awardConfidence" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcingCriterion" (
    "id" TEXT NOT NULL,
    "sourcingEventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "SourcingCriterionType" NOT NULL,
    "weight" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcingCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcingInvitation" (
    "id" TEXT NOT NULL,
    "sourcingEventId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "SourcingInvitationStatus" NOT NULL DEFAULT 'INVITED',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "SourcingInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcingResponse" (
    "id" TEXT NOT NULL,
    "sourcingEventId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "status" "SourcingResponseStatus" NOT NULL DEFAULT 'DRAFT',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "totalBid" DECIMAL(18,2),
    "deliveryDays" INTEGER,
    "paymentTerms" TEXT,
    "technicalResponse" TEXT,
    "commercialNotes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcingResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcingScore" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "score" DECIMAL(8,2) NOT NULL,
    "weightedScore" DECIMAL(10,4) NOT NULL,
    "evaluatorId" TEXT,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcingScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SourcingEvent_tenantId_status_createdAt_idx" ON "SourcingEvent"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SourcingEvent_tenantId_eventNumber_key" ON "SourcingEvent"("tenantId", "eventNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SourcingCriterion_sourcingEventId_sequence_key" ON "SourcingCriterion"("sourcingEventId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "SourcingInvitation_sourcingEventId_supplierId_key" ON "SourcingInvitation"("sourcingEventId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "SourcingResponse_sourcingEventId_supplierId_round_key" ON "SourcingResponse"("sourcingEventId", "supplierId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "SourcingScore_responseId_criterionId_key" ON "SourcingScore"("responseId", "criterionId");

-- AddForeignKey
ALTER TABLE "SourcingEvent" ADD CONSTRAINT "SourcingEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingCriterion" ADD CONSTRAINT "SourcingCriterion_sourcingEventId_fkey" FOREIGN KEY ("sourcingEventId") REFERENCES "SourcingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingInvitation" ADD CONSTRAINT "SourcingInvitation_sourcingEventId_fkey" FOREIGN KEY ("sourcingEventId") REFERENCES "SourcingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingInvitation" ADD CONSTRAINT "SourcingInvitation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingResponse" ADD CONSTRAINT "SourcingResponse_sourcingEventId_fkey" FOREIGN KEY ("sourcingEventId") REFERENCES "SourcingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingResponse" ADD CONSTRAINT "SourcingResponse_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingScore" ADD CONSTRAINT "SourcingScore_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "SourcingResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingScore" ADD CONSTRAINT "SourcingScore_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "SourcingCriterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
