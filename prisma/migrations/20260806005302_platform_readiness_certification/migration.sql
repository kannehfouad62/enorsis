-- CreateEnum
CREATE TYPE "PlatformCertificationStatus" AS ENUM ('DRAFT', 'RUNNING', 'PASSED', 'PASSED_WITH_WARNINGS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlatformReadinessCheckStatus" AS ENUM ('PASS', 'WARN', 'FAIL', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PlatformReadinessSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "PlatformCertificationRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "releaseVersion" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'PRODUCTION',
    "status" "PlatformCertificationStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "initiatedByUserId" TEXT,
    "certifiedByUserId" TEXT,
    "certifiedAt" TIMESTAMP(3),
    "summary" JSONB,
    "releaseBlocked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCertificationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformReadinessCheck" (
    "id" TEXT NOT NULL,
    "certificationRunId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PlatformReadinessCheckStatus" NOT NULL,
    "severity" "PlatformReadinessSeverity" NOT NULL,
    "releaseBlocking" BOOLEAN NOT NULL DEFAULT false,
    "observedValue" TEXT,
    "expectedValue" TEXT,
    "evidence" JSONB,
    "remediation" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformReadinessCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformCertificationRun_tenantId_createdAt_idx" ON "PlatformCertificationRun"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformCertificationRun_status_createdAt_idx" ON "PlatformCertificationRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformCertificationRun_environment_releaseVersion_idx" ON "PlatformCertificationRun"("environment", "releaseVersion");

-- CreateIndex
CREATE INDEX "PlatformReadinessCheck_status_severity_idx" ON "PlatformReadinessCheck"("status", "severity");

-- CreateIndex
CREATE INDEX "PlatformReadinessCheck_category_status_idx" ON "PlatformReadinessCheck"("category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformReadinessCheck_certificationRunId_key_key" ON "PlatformReadinessCheck"("certificationRunId", "key");

-- AddForeignKey
ALTER TABLE "PlatformCertificationRun" ADD CONSTRAINT "PlatformCertificationRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformReadinessCheck" ADD CONSTRAINT "PlatformReadinessCheck_certificationRunId_fkey" FOREIGN KEY ("certificationRunId") REFERENCES "PlatformCertificationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
