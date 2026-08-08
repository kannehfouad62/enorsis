-- Normalize PostgreSQL index names to Prisma-generated names.
-- These statements rename existing indexes only.

ALTER INDEX "PredictiveInventoryOptimizationSignal_tenantId_inventoryItemId_"
RENAME TO "PredictiveInventoryOptimizationSignal_tenantId_inventoryIte_idx";

ALTER INDEX "PredictiveInventoryOptimizationSignal_tenantId_optimizationRunI"
RENAME TO "PredictiveInventoryOptimizationSignal_tenantId_optimization_idx";
