-- Normalize PostgreSQL index names to Prisma-generated names.
-- These statements rename existing indexes only.

ALTER INDEX "PredictiveCapacityPlanningSignal_tenantId_capacityRunId_riskLev"
RENAME TO "PredictiveCapacityPlanningSignal_tenantId_capacityRunId_ris_idx";

ALTER INDEX "PredictiveCapacityPlanningSignal_tenantId_scopeType_scopeKey_id"
RENAME TO "PredictiveCapacityPlanningSignal_tenantId_scopeType_scopeKe_idx";
