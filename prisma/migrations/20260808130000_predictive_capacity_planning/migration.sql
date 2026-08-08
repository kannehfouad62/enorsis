CREATE TABLE "PredictiveCapacityPlanningRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "horizonDays" INTEGER NOT NULL DEFAULT 90,
    "targetHeadroomPct" DECIMAL(6,2) NOT NULL DEFAULT 20,
    "modelVersion" TEXT NOT NULL DEFAULT 'ENORSIS_CAPACITY_V1',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "assumptions" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PredictiveCapacityPlanningRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PredictiveCapacityPlanningSignal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "capacityRunId" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "scopeLabel" TEXT NOT NULL,
    "currentUnits" DECIMAL(20,4) NOT NULL,
    "projectedDemandUnits" DECIMAL(20,4) NOT NULL,
    "projectedInboundUnits" DECIMAL(20,4) NOT NULL,
    "projectedEndingUnits" DECIMAL(20,4) NOT NULL,
    "operatingCapacityProxy" DECIMAL(20,4) NOT NULL,
    "currentUtilizationPct" DECIMAL(8,2) NOT NULL,
    "projectedUtilizationPct" DECIMAL(8,2) NOT NULL,
    "capacityGapUnits" DECIMAL(20,4) NOT NULL,
    "pressureScore" DECIMAL(8,2) NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "recommendation" TEXT NOT NULL,
    "confidence" DECIMAL(6,2) NOT NULL,
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PredictiveCapacityPlanningSignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PredictiveCapacityPlanningRun_tenantId_generatedAt_idx"
ON "PredictiveCapacityPlanningRun"("tenantId", "generatedAt");

CREATE INDEX "PredictiveCapacityPlanningRun_tenantId_status_idx"
ON "PredictiveCapacityPlanningRun"("tenantId", "status");

CREATE INDEX "PredictiveCapacityPlanningSignal_tenantId_capacityRunId_riskLevel_idx"
ON "PredictiveCapacityPlanningSignal"("tenantId", "capacityRunId", "riskLevel");

CREATE INDEX "PredictiveCapacityPlanningSignal_tenantId_scopeType_scopeKey_idx"
ON "PredictiveCapacityPlanningSignal"("tenantId", "scopeType", "scopeKey");

CREATE INDEX "PredictiveCapacityPlanningSignal_projectedUtilizationPct_idx"
ON "PredictiveCapacityPlanningSignal"("projectedUtilizationPct");
