-- CreateEnum
CREATE TYPE "ExecutiveBoardReportScheduleStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "ExecutiveBoardReportScheduleFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "ExecutiveBoardReportScheduleRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "ExecutiveBoardReportSchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ExecutiveBoardReportScheduleStatus" NOT NULL DEFAULT 'ACTIVE',
    "frequency" "ExecutiveBoardReportScheduleFrequency" NOT NULL,
    "dayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "monthOfYear" INTEGER,
    "hourUtc" INTEGER NOT NULL DEFAULT 8,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "lastBoardPackId" TEXT,
    "generateFinalized" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutiveBoardReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutiveBoardReportScheduleRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "status" "ExecutiveBoardReportScheduleRunStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "boardPackId" TEXT,
    "errorMessage" TEXT,
    "sourceFingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutiveBoardReportScheduleRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExecutiveBoardReportSchedule_tenantId_status_nextRunAt_idx" ON "ExecutiveBoardReportSchedule"("tenantId", "status", "nextRunAt");

-- CreateIndex
CREATE INDEX "ExecutiveBoardReportSchedule_definitionId_idx" ON "ExecutiveBoardReportSchedule"("definitionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutiveBoardReportSchedule_tenantId_definitionId_frequenc_key" ON "ExecutiveBoardReportSchedule"("tenantId", "definitionId", "frequency");

-- CreateIndex
CREATE INDEX "ExecutiveBoardReportScheduleRun_tenantId_status_scheduledFo_idx" ON "ExecutiveBoardReportScheduleRun"("tenantId", "status", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutiveBoardReportScheduleRun_scheduleId_scheduledFor_key" ON "ExecutiveBoardReportScheduleRun"("scheduleId", "scheduledFor");

-- AddForeignKey
ALTER TABLE "ExecutiveBoardReportSchedule" ADD CONSTRAINT "ExecutiveBoardReportSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveBoardReportSchedule" ADD CONSTRAINT "ExecutiveBoardReportSchedule_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "ExecutiveBoardPackDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveBoardReportScheduleRun" ADD CONSTRAINT "ExecutiveBoardReportScheduleRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveBoardReportScheduleRun" ADD CONSTRAINT "ExecutiveBoardReportScheduleRun_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ExecutiveBoardReportSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
