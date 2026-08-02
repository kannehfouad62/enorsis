-- CreateEnum
CREATE TYPE "SourcingAwardStatus" AS ENUM ('DRAFT', 'RECOMMENDED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "SourcingAward" (
    "id" TEXT NOT NULL,
    "sourcingEventId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "status" "SourcingAwardStatus" NOT NULL DEFAULT 'DRAFT',
    "recommendation" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "totalWeightedScore" DECIMAL(10,4) NOT NULL,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "decisionComments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcingAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourcingAward_sourcingEventId_key" ON "SourcingAward"("sourcingEventId");

-- CreateIndex
CREATE INDEX "SourcingAward_supplierId_idx" ON "SourcingAward"("supplierId");

-- CreateIndex
CREATE INDEX "SourcingAward_status_idx" ON "SourcingAward"("status");

-- AddForeignKey
ALTER TABLE "SourcingAward" ADD CONSTRAINT "SourcingAward_sourcingEventId_fkey" FOREIGN KEY ("sourcingEventId") REFERENCES "SourcingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
