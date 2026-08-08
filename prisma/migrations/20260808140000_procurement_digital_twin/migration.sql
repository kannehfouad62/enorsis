CREATE TABLE "ProcurementDigitalTwinScenario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scenarioType" TEXT NOT NULL DEFAULT 'COMBINED',
    "horizonDays" INTEGER NOT NULL DEFAULT 90,
    "demandShockPct" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "leadTimeShockPct" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "costInflationPct" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "supplierDisruptionPct" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "inboundReductionPct" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "safetyStockChangePct" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "assumptions" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "simulatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProcurementDigitalTwinScenario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProcurementDigitalTwinRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL DEFAULT 'ENORSIS_DIGITAL_TWIN_V1',
    "baselineSnapshot" JSONB NOT NULL,
    "scenarioSnapshot" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "recommendation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcurementDigitalTwinRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProcurementDigitalTwinImpact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "digitalTwinRunId" TEXT NOT NULL,
    "impactType" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "scopeLabel" TEXT NOT NULL,
    "baselineValue" DECIMAL(20,4),
    "scenarioValue" DECIMAL(20,4),
    "varianceValue" DECIMAL(20,4),
    "variancePct" DECIMAL(10,4),
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "explanation" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcurementDigitalTwinImpact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProcurementDigitalTwinScenario_tenantId_createdAt_idx"
ON "ProcurementDigitalTwinScenario"("tenantId", "createdAt");

CREATE INDEX "ProcurementDigitalTwinScenario_tenantId_status_idx"
ON "ProcurementDigitalTwinScenario"("tenantId", "status");

CREATE INDEX "ProcurementDigitalTwinRun_tenantId_scenarioId_generatedAt_idx"
ON "ProcurementDigitalTwinRun"("tenantId", "scenarioId", "generatedAt");

CREATE INDEX "ProcurementDigitalTwinRun_tenantId_riskLevel_idx"
ON "ProcurementDigitalTwinRun"("tenantId", "riskLevel");

CREATE INDEX "ProcurementDigitalTwinImpact_tenantId_digitalTwinRunId_impactType_idx"
ON "ProcurementDigitalTwinImpact"("tenantId", "digitalTwinRunId", "impactType");

CREATE INDEX "ProcurementDigitalTwinImpact_tenantId_severity_idx"
ON "ProcurementDigitalTwinImpact"("tenantId", "severity");

CREATE INDEX "ProcurementDigitalTwinImpact_scopeKey_idx"
ON "ProcurementDigitalTwinImpact"("scopeKey");
