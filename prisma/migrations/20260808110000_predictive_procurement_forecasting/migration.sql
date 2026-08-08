CREATE TABLE "PredictiveProcurementForecastRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "horizonDays" INTEGER NOT NULL DEFAULT 90,
    "modelVersion" TEXT NOT NULL DEFAULT 'ENORSIS_PREDICTIVE_V1',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "sourceWindowStart" TIMESTAMP(3) NOT NULL,
    "sourceWindowEnd" TIMESTAMP(3) NOT NULL,
    "assumptions" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PredictiveProcurementForecastRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PredictiveProcurementForecastSignal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "forecastRunId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "scopeLabel" TEXT NOT NULL,
    "currentValue" DECIMAL(20,4),
    "forecastValue" DECIMAL(20,4),
    "changePercent" DECIMAL(10,4),
    "confidence" DECIMAL(6,2),
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PredictiveProcurementForecastSignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PredictiveProcurementForecastRun_tenantId_generatedAt_idx"
ON "PredictiveProcurementForecastRun"("tenantId", "generatedAt");

CREATE INDEX "PredictiveProcurementForecastRun_tenantId_status_idx"
ON "PredictiveProcurementForecastRun"("tenantId", "status");

CREATE INDEX "PredictiveProcurementForecastSignal_tenantId_forecastRunId_signalType_idx"
ON "PredictiveProcurementForecastSignal"("tenantId", "forecastRunId", "signalType");

CREATE INDEX "PredictiveProcurementForecastSignal_tenantId_riskLevel_idx"
ON "PredictiveProcurementForecastSignal"("tenantId", "riskLevel");

CREATE INDEX "PredictiveProcurementForecastSignal_scopeKey_idx"
ON "PredictiveProcurementForecastSignal"("scopeKey");
