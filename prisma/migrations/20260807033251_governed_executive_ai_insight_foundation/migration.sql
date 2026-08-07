-- CreateEnum
CREATE TYPE "GovernedExecutiveInsightType" AS ENUM ('RISK', 'OPPORTUNITY', 'PERFORMANCE', 'ANOMALY', 'GOVERNANCE', 'FORECAST');

-- CreateEnum
CREATE TYPE "GovernedExecutiveInsightStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACKNOWLEDGED', 'DISMISSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GovernedExecutiveInsightRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_WARNINGS', 'FAILED');

-- CreateEnum
CREATE TYPE "GovernedExecutiveInsightFeedbackType" AS ENUM ('USEFUL', 'NOT_USEFUL', 'INCORRECT', 'NEEDS_CONTEXT');

-- CreateTable
CREATE TABLE "GovernedExecutiveInsightRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runNumber" TEXT NOT NULL,
    "status" "GovernedExecutiveInsightRunStatus" NOT NULL DEFAULT 'PENDING',
    "engineVersion" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "initiatedByUserId" TEXT,
    "insightCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernedExecutiveInsightRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernedExecutiveInsight" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "insightRunId" TEXT NOT NULL,
    "insightKey" TEXT NOT NULL,
    "type" "GovernedExecutiveInsightType" NOT NULL,
    "status" "GovernedExecutiveInsightStatus" NOT NULL DEFAULT 'PUBLISHED',
    "severity" "RequisitionOrderExceptionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "executiveSummary" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "recommendation" TEXT,
    "confidenceScore" DECIMAL(5,2) NOT NULL,
    "domain" TEXT NOT NULL,
    "category" TEXT,
    "sourceModule" TEXT NOT NULL,
    "calculationVersion" TEXT NOT NULL,
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedByUserId" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "dismissedByUserId" TEXT,
    "dismissedAt" TIMESTAMP(3),
    "dismissalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernedExecutiveInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernedExecutiveInsightEvidence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "metricKey" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "label" TEXT NOT NULL,
    "observedValue" TEXT,
    "expectedValue" TEXT,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernedExecutiveInsightEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernedExecutiveInsightFeedback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedbackType" "GovernedExecutiveInsightFeedbackType" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernedExecutiveInsightFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GovernedExecutiveInsightRun_tenantId_status_createdAt_idx" ON "GovernedExecutiveInsightRun"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GovernedExecutiveInsightRun_tenantId_runNumber_key" ON "GovernedExecutiveInsightRun"("tenantId", "runNumber");

-- CreateIndex
CREATE INDEX "GovernedExecutiveInsight_tenantId_status_severity_createdAt_idx" ON "GovernedExecutiveInsight"("tenantId", "status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "GovernedExecutiveInsight_domain_type_createdAt_idx" ON "GovernedExecutiveInsight"("domain", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GovernedExecutiveInsight_tenantId_insightRunId_insightKey_key" ON "GovernedExecutiveInsight"("tenantId", "insightRunId", "insightKey");

-- CreateIndex
CREATE INDEX "GovernedExecutiveInsightEvidence_tenantId_createdAt_idx" ON "GovernedExecutiveInsightEvidence"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "GovernedExecutiveInsightEvidence_insightId_idx" ON "GovernedExecutiveInsightEvidence"("insightId");

-- CreateIndex
CREATE INDEX "GovernedExecutiveInsightEvidence_metricKey_idx" ON "GovernedExecutiveInsightEvidence"("metricKey");

-- CreateIndex
CREATE INDEX "GovernedExecutiveInsightFeedback_tenantId_createdAt_idx" ON "GovernedExecutiveInsightFeedback"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "GovernedExecutiveInsightFeedback_insightId_idx" ON "GovernedExecutiveInsightFeedback"("insightId");

-- CreateIndex
CREATE INDEX "GovernedExecutiveInsightFeedback_userId_idx" ON "GovernedExecutiveInsightFeedback"("userId");

-- AddForeignKey
ALTER TABLE "GovernedExecutiveInsightRun" ADD CONSTRAINT "GovernedExecutiveInsightRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernedExecutiveInsight" ADD CONSTRAINT "GovernedExecutiveInsight_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernedExecutiveInsight" ADD CONSTRAINT "GovernedExecutiveInsight_insightRunId_fkey" FOREIGN KEY ("insightRunId") REFERENCES "GovernedExecutiveInsightRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernedExecutiveInsightEvidence" ADD CONSTRAINT "GovernedExecutiveInsightEvidence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernedExecutiveInsightEvidence" ADD CONSTRAINT "GovernedExecutiveInsightEvidence_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "GovernedExecutiveInsight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernedExecutiveInsightFeedback" ADD CONSTRAINT "GovernedExecutiveInsightFeedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernedExecutiveInsightFeedback" ADD CONSTRAINT "GovernedExecutiveInsightFeedback_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "GovernedExecutiveInsight"("id") ON DELETE CASCADE ON UPDATE CASCADE;
