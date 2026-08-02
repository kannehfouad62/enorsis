/*
  Warnings:

  - A unique constraint covering the columns `[accessTokenHash]` on the table `SourcingInvitation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SourcingQuestionStatus" AS ENUM ('OPEN', 'ANSWERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SourcingAttachmentType" AS ENUM ('RESPONSE', 'CLARIFICATION', 'EVENT_DOCUMENT');

-- CreateEnum
CREATE TYPE "SealedBidOpeningStatus" AS ENUM ('SCHEDULED', 'OPENED', 'CANCELLED');

-- AlterTable
ALTER TABLE "SourcingInvitation" ADD COLUMN     "accessExpiresAt" TIMESTAMP(3),
ADD COLUMN     "accessRevokedAt" TIMESTAMP(3),
ADD COLUMN     "accessTokenHash" TEXT;

-- CreateTable
CREATE TABLE "SourcingQuestion" (
    "id" TEXT NOT NULL,
    "sourcingEventId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "status" "SourcingQuestionStatus" NOT NULL DEFAULT 'OPEN',
    "askedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "answeredByUserId" TEXT,

    CONSTRAINT "SourcingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcingAttachment" (
    "id" TEXT NOT NULL,
    "sourcingEventId" TEXT NOT NULL,
    "responseId" TEXT,
    "supplierId" TEXT,
    "type" "SourcingAttachmentType" NOT NULL,
    "name" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedByLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourcingAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SealedBidOpening" (
    "id" TEXT NOT NULL,
    "sourcingEventId" TEXT NOT NULL,
    "status" "SealedBidOpeningStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "openedByUserId" TEXT,
    "witnessUserIds" TEXT[],
    "openingNotes" TEXT,
    "responseCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SealedBidOpening_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SourcingQuestion_sourcingEventId_status_idx" ON "SourcingQuestion"("sourcingEventId", "status");

-- CreateIndex
CREATE INDEX "SourcingQuestion_supplierId_status_idx" ON "SourcingQuestion"("supplierId", "status");

-- CreateIndex
CREATE INDEX "SourcingAttachment_sourcingEventId_type_idx" ON "SourcingAttachment"("sourcingEventId", "type");

-- CreateIndex
CREATE INDEX "SourcingAttachment_responseId_idx" ON "SourcingAttachment"("responseId");

-- CreateIndex
CREATE UNIQUE INDEX "SealedBidOpening_sourcingEventId_key" ON "SealedBidOpening"("sourcingEventId");

-- CreateIndex
CREATE UNIQUE INDEX "SourcingInvitation_accessTokenHash_key" ON "SourcingInvitation"("accessTokenHash");

-- AddForeignKey
ALTER TABLE "SourcingQuestion" ADD CONSTRAINT "SourcingQuestion_sourcingEventId_fkey" FOREIGN KEY ("sourcingEventId") REFERENCES "SourcingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingQuestion" ADD CONSTRAINT "SourcingQuestion_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingAttachment" ADD CONSTRAINT "SourcingAttachment_sourcingEventId_fkey" FOREIGN KEY ("sourcingEventId") REFERENCES "SourcingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingAttachment" ADD CONSTRAINT "SourcingAttachment_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "SourcingResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SealedBidOpening" ADD CONSTRAINT "SealedBidOpening_sourcingEventId_fkey" FOREIGN KEY ("sourcingEventId") REFERENCES "SourcingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
