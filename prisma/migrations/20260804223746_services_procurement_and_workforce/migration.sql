-- CreateEnum
CREATE TYPE "StatementOfWorkStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceEngagementType" AS ENUM ('FIXED_FEE', 'TIME_AND_MATERIALS', 'RETAINER', 'MILESTONE_BASED', 'CONTINGENT_LABOR');

-- CreateEnum
CREATE TYPE "ServiceMilestoneStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "ServiceWorkerStatus" AS ENUM ('PLANNED', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ServiceTimeEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'INVOICED');

-- CreateTable
CREATE TABLE "StatementOfWork" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "sowNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "engagementType" "ServiceEngagementType" NOT NULL,
    "status" "StatementOfWorkStatus" NOT NULL DEFAULT 'DRAFT',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "notToExceedAmount" DECIMAL(18,2) NOT NULL,
    "committedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "approvedAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "businessOwnerUserId" TEXT NOT NULL,
    "procurementOwnerUserId" TEXT NOT NULL,
    "scopeOfWork" TEXT NOT NULL,
    "deliverables" TEXT NOT NULL,
    "acceptanceCriteria" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatementOfWork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceMilestone" (
    "id" TEXT NOT NULL,
    "statementOfWorkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ServiceMilestoneStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "acceptanceNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceWorker" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "statementOfWorkId" TEXT NOT NULL,
    "workerReference" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "roleTitle" TEXT NOT NULL,
    "status" "ServiceWorkerStatus" NOT NULL DEFAULT 'PLANNED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "hourlyRate" DECIMAL(18,4),
    "dailyRate" DECIMAL(18,4),
    "maximumHours" DECIMAL(18,2),
    "managerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTimeEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "statementOfWorkId" TEXT NOT NULL,
    "serviceWorkerId" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(10,2) NOT NULL,
    "rate" DECIMAL(18,4) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ServiceTimeEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StatementOfWork_tenantId_status_startsAt_idx" ON "StatementOfWork"("tenantId", "status", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "StatementOfWork_tenantId_sowNumber_key" ON "StatementOfWork"("tenantId", "sowNumber");

-- CreateIndex
CREATE INDEX "ServiceMilestone_statementOfWorkId_status_dueAt_idx" ON "ServiceMilestone"("statementOfWorkId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "ServiceWorker_tenantId_status_startsAt_idx" ON "ServiceWorker"("tenantId", "status", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceWorker_statementOfWorkId_workerReference_key" ON "ServiceWorker"("statementOfWorkId", "workerReference");

-- CreateIndex
CREATE INDEX "ServiceTimeEntry_tenantId_status_workDate_idx" ON "ServiceTimeEntry"("tenantId", "status", "workDate");

-- AddForeignKey
ALTER TABLE "StatementOfWork" ADD CONSTRAINT "StatementOfWork_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatementOfWork" ADD CONSTRAINT "StatementOfWork_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMilestone" ADD CONSTRAINT "ServiceMilestone_statementOfWorkId_fkey" FOREIGN KEY ("statementOfWorkId") REFERENCES "StatementOfWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceWorker" ADD CONSTRAINT "ServiceWorker_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceWorker" ADD CONSTRAINT "ServiceWorker_statementOfWorkId_fkey" FOREIGN KEY ("statementOfWorkId") REFERENCES "StatementOfWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTimeEntry" ADD CONSTRAINT "ServiceTimeEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTimeEntry" ADD CONSTRAINT "ServiceTimeEntry_statementOfWorkId_fkey" FOREIGN KEY ("statementOfWorkId") REFERENCES "StatementOfWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTimeEntry" ADD CONSTRAINT "ServiceTimeEntry_serviceWorkerId_fkey" FOREIGN KEY ("serviceWorkerId") REFERENCES "ServiceWorker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
