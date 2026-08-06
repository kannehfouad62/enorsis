-- CreateEnum
CREATE TYPE "ProcurementProcessCertificationStatus" AS ENUM ('DRAFT', 'RUNNING', 'PASSED', 'PASSED_WITH_WARNINGS', 'FAILED', 'CERTIFIED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProcurementProcessCheckStatus" AS ENUM ('PASS', 'WARN', 'FAIL', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ProcurementProcessCheckSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "ProcurementProcessCertification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "certificationNumber" TEXT NOT NULL,
    "status" "ProcurementProcessCertificationStatus" NOT NULL DEFAULT 'DRAFT',
    "releaseBlocked" BOOLEAN NOT NULL DEFAULT true,
    "summary" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "certifiedAt" TIMESTAMP(3),
    "initiatedByUserId" TEXT,
    "certifiedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementProcessCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementProcessCheck" (
    "id" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProcurementProcessCheckStatus" NOT NULL,
    "severity" "ProcurementProcessCheckSeverity" NOT NULL,
    "releaseBlocking" BOOLEAN NOT NULL DEFAULT false,
    "observedValue" TEXT,
    "expectedValue" TEXT,
    "remediation" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcurementProcessCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcurementProcessCertification_tenantId_status_createdAt_idx" ON "ProcurementProcessCertification"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ProcurementProcessCertification_journeyId_idx" ON "ProcurementProcessCertification"("journeyId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementProcessCertification_tenantId_certificationNumbe_key" ON "ProcurementProcessCertification"("tenantId", "certificationNumber");

-- CreateIndex
CREATE INDEX "ProcurementProcessCheck_status_severity_idx" ON "ProcurementProcessCheck"("status", "severity");

-- CreateIndex
CREATE INDEX "ProcurementProcessCheck_category_status_idx" ON "ProcurementProcessCheck"("category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementProcessCheck_certificationId_key_key" ON "ProcurementProcessCheck"("certificationId", "key");

-- AddForeignKey
ALTER TABLE "ProcurementProcessCertification" ADD CONSTRAINT "ProcurementProcessCertification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementProcessCertification" ADD CONSTRAINT "ProcurementProcessCertification_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "RequisitionOrderJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementProcessCheck" ADD CONSTRAINT "ProcurementProcessCheck_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "ProcurementProcessCertification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
