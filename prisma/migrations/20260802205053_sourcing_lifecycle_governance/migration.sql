-- CreateEnum
CREATE TYPE "SourcingEvaluatorStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REMOVED');

-- CreateEnum
CREATE TYPE "SourcingRoundStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SourcingEvaluator" (
    "id" TEXT NOT NULL,
    "sourcingEventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SourcingEvaluatorStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedByUserId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SourcingEvaluator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcingRound" (
    "id" TEXT NOT NULL,
    "sourcingEventId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "status" "SourcingRoundStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcingRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SourcingEvaluator_userId_status_idx" ON "SourcingEvaluator"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SourcingEvaluator_sourcingEventId_userId_key" ON "SourcingEvaluator"("sourcingEventId", "userId");

-- CreateIndex
CREATE INDEX "SourcingRound_sourcingEventId_status_idx" ON "SourcingRound"("sourcingEventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SourcingRound_sourcingEventId_roundNumber_key" ON "SourcingRound"("sourcingEventId", "roundNumber");

-- AddForeignKey
ALTER TABLE "SourcingEvaluator" ADD CONSTRAINT "SourcingEvaluator_sourcingEventId_fkey" FOREIGN KEY ("sourcingEventId") REFERENCES "SourcingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingRound" ADD CONSTRAINT "SourcingRound_sourcingEventId_fkey" FOREIGN KEY ("sourcingEventId") REFERENCES "SourcingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
