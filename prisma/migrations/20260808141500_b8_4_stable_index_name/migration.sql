-- B8.4 permanent index-name normalization.
-- Rename the PostgreSQL-truncated index to the explicit Prisma map name.
-- No data, columns, constraints, or business logic are changed.

ALTER INDEX "ProcurementDigitalTwinImpact_tenantId_digitalTwinRunId_impactTy"
RENAME TO "PDigitalTwinImpact_run_type_idx";
