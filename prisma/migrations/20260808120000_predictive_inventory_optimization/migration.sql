CREATE TABLE "PredictiveInventoryOptimizationRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "horizonDays" INTEGER NOT NULL DEFAULT 90,
    "modelVersion" TEXT NOT NULL DEFAULT 'ENORSIS_INVENTORY_OPT_V1',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "assumptions" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PredictiveInventoryOptimizationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PredictiveInventoryOptimizationSignal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "optimizationRunId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT,
    "currentOnHand" DECIMAL(20,4) NOT NULL,
    "currentAvailable" DECIMAL(20,4) NOT NULL,
    "currentReserved" DECIMAL(20,4) NOT NULL,
    "dailyDemand" DECIMAL(20,6) NOT NULL,
    "horizonDemand" DECIMAL(20,4) NOT NULL,
    "currentReorderPoint" DECIMAL(20,4) NOT NULL,
    "predictedReorderPoint" DECIMAL(20,4) NOT NULL,
    "currentSafetyStock" DECIMAL(20,4) NOT NULL,
    "recommendedSafetyStock" DECIMAL(20,4) NOT NULL,
    "suggestedReorderQty" DECIMAL(20,4) NOT NULL,
    "stockoutProbability" DECIMAL(6,2) NOT NULL,
    "daysOfSupply" DECIMAL(12,2),
    "excessQuantity" DECIMAL(20,4) NOT NULL,
    "excessValue" DECIMAL(20,4) NOT NULL,
    "unitCost" DECIMAL(20,4) NOT NULL,
    "leadTimeDays" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "recommendation" TEXT NOT NULL,
    "confidence" DECIMAL(6,2) NOT NULL,
    "evidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PredictiveInventoryOptimizationSignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PredictiveInventoryOptimizationRun_tenantId_generatedAt_idx"
ON "PredictiveInventoryOptimizationRun"("tenantId", "generatedAt");
CREATE INDEX "PredictiveInventoryOptimizationRun_tenantId_status_idx"
ON "PredictiveInventoryOptimizationRun"("tenantId", "status");
CREATE INDEX "PredictiveInventoryOptimizationSignal_tenantId_optimizationRunId_riskLevel_idx"
ON "PredictiveInventoryOptimizationSignal"("tenantId", "optimizationRunId", "riskLevel");
CREATE INDEX "PredictiveInventoryOptimizationSignal_tenantId_inventoryItemId_idx"
ON "PredictiveInventoryOptimizationSignal"("tenantId", "inventoryItemId");
CREATE INDEX "PredictiveInventoryOptimizationSignal_stockoutProbability_idx"
ON "PredictiveInventoryOptimizationSignal"("stockoutProbability");
CREATE INDEX "PredictiveInventoryOptimizationSignal_suggestedReorderQty_idx"
ON "PredictiveInventoryOptimizationSignal"("suggestedReorderQty");
