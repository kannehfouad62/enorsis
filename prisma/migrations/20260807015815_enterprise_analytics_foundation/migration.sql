-- CreateEnum
CREATE TYPE "EnterpriseAnalyticsMetricType" AS ENUM ('COUNT', 'SUM', 'AVERAGE', 'PERCENTAGE', 'CURRENCY', 'DURATION', 'SCORE', 'RATIO');

-- CreateEnum
CREATE TYPE "EnterpriseAnalyticsPeriodType" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'POINT_IN_TIME');

-- CreateEnum
CREATE TYPE "EnterpriseAnalyticsTrendDirection" AS ENUM ('UP', 'DOWN', 'FLAT', 'NOT_AVAILABLE');

-- CreateEnum
CREATE TYPE "EnterpriseAnalyticsHealthStatus" AS ENUM ('GOOD', 'WATCH', 'WARNING', 'CRITICAL', 'NOT_AVAILABLE');

-- CreateEnum
CREATE TYPE "EnterpriseAnalyticsRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'COMPLETED_WITH_WARNINGS', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "EnterpriseAnalyticsMetricDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "metricKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "domain" TEXT NOT NULL,
    "category" TEXT,
    "metricType" "EnterpriseAnalyticsMetricType" NOT NULL,
    "unit" TEXT,
    "currencyCode" TEXT,
    "targetValue" DECIMAL(24,8),
    "warningThreshold" DECIMAL(24,8),
    "criticalThreshold" DECIMAL(24,8),
    "higherIsBetter" BOOLEAN NOT NULL DEFAULT true,
    "calculationVersion" TEXT NOT NULL DEFAULT '1.0',
    "sourceModule" TEXT,
    "drilldownPath" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseAnalyticsMetricDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseAnalyticsMetricSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "metricDefinitionId" TEXT NOT NULL,
    "periodType" "EnterpriseAnalyticsPeriodType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "numericValue" DECIMAL(24,8) NOT NULL,
    "previousValue" DECIMAL(24,8),
    "targetValue" DECIMAL(24,8),
    "varianceValue" DECIMAL(24,8),
    "variancePercent" DECIMAL(18,6),
    "trendDirection" "EnterpriseAnalyticsTrendDirection" NOT NULL DEFAULT 'NOT_AVAILABLE',
    "healthStatus" "EnterpriseAnalyticsHealthStatus" NOT NULL DEFAULT 'NOT_AVAILABLE',
    "dimensionKey" TEXT NOT NULL DEFAULT 'ALL',
    "dimensions" JSONB,
    "calculationVersion" TEXT NOT NULL,
    "sourceRecordCount" INTEGER NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggregationRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseAnalyticsMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseAnalyticsAggregationRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runNumber" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "status" "EnterpriseAnalyticsRunStatus" NOT NULL DEFAULT 'PENDING',
    "periodType" "EnterpriseAnalyticsPeriodType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "initiatedByUserId" TEXT,
    "metricsRequested" INTEGER NOT NULL DEFAULT 0,
    "metricsCalculated" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseAnalyticsAggregationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseAnalyticsAggregationFailure" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "aggregationRunId" TEXT NOT NULL,
    "metricKey" TEXT,
    "sourceModule" TEXT,
    "severity" "RequisitionOrderExceptionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "message" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseAnalyticsAggregationFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnterpriseAnalyticsMetricDefinition_domain_category_active_idx" ON "EnterpriseAnalyticsMetricDefinition"("domain", "category", "active");

-- CreateIndex
CREATE INDEX "EnterpriseAnalyticsMetricDefinition_tenantId_active_idx" ON "EnterpriseAnalyticsMetricDefinition"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseAnalyticsMetricDefinition_tenantId_metricKey_key" ON "EnterpriseAnalyticsMetricDefinition"("tenantId", "metricKey");

-- CreateIndex
CREATE INDEX "EnterpriseAnalyticsMetricSnapshot_tenantId_periodType_perio_idx" ON "EnterpriseAnalyticsMetricSnapshot"("tenantId", "periodType", "periodStart");

-- CreateIndex
CREATE INDEX "EnterpriseAnalyticsMetricSnapshot_metricDefinitionId_calcul_idx" ON "EnterpriseAnalyticsMetricSnapshot"("metricDefinitionId", "calculatedAt");

-- CreateIndex
CREATE INDEX "EnterpriseAnalyticsMetricSnapshot_healthStatus_calculatedAt_idx" ON "EnterpriseAnalyticsMetricSnapshot"("healthStatus", "calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseAnalyticsMetricSnapshot_tenantId_metricDefinition_key" ON "EnterpriseAnalyticsMetricSnapshot"("tenantId", "metricDefinitionId", "periodType", "periodStart", "dimensionKey");

-- CreateIndex
CREATE INDEX "EnterpriseAnalyticsAggregationRun_tenantId_status_createdAt_idx" ON "EnterpriseAnalyticsAggregationRun"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "EnterpriseAnalyticsAggregationRun_periodType_periodStart_idx" ON "EnterpriseAnalyticsAggregationRun"("periodType", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseAnalyticsAggregationRun_tenantId_runNumber_key" ON "EnterpriseAnalyticsAggregationRun"("tenantId", "runNumber");

-- CreateIndex
CREATE INDEX "EnterpriseAnalyticsAggregationFailure_tenantId_createdAt_idx" ON "EnterpriseAnalyticsAggregationFailure"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "EnterpriseAnalyticsAggregationFailure_aggregationRunId_idx" ON "EnterpriseAnalyticsAggregationFailure"("aggregationRunId");

-- AddForeignKey
ALTER TABLE "EnterpriseAnalyticsMetricDefinition" ADD CONSTRAINT "EnterpriseAnalyticsMetricDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAnalyticsMetricSnapshot" ADD CONSTRAINT "EnterpriseAnalyticsMetricSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAnalyticsMetricSnapshot" ADD CONSTRAINT "EnterpriseAnalyticsMetricSnapshot_metricDefinitionId_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "EnterpriseAnalyticsMetricDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAnalyticsMetricSnapshot" ADD CONSTRAINT "EnterpriseAnalyticsMetricSnapshot_aggregationRunId_fkey" FOREIGN KEY ("aggregationRunId") REFERENCES "EnterpriseAnalyticsAggregationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAnalyticsAggregationRun" ADD CONSTRAINT "EnterpriseAnalyticsAggregationRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAnalyticsAggregationFailure" ADD CONSTRAINT "EnterpriseAnalyticsAggregationFailure_aggregationRunId_fkey" FOREIGN KEY ("aggregationRunId") REFERENCES "EnterpriseAnalyticsAggregationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseAnalyticsAggregationFailure" ADD CONSTRAINT "EnterpriseAnalyticsAggregationFailure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
