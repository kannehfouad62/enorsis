-- Normalize the predictive forecast signal index name to Prisma's
-- generated PostgreSQL identifier. This changes only the index name.

ALTER INDEX "PredictiveProcurementForecastSignal_tenantId_forecastRunId_sign"
RENAME TO "PredictiveProcurementForecastSignal_tenantId_forecastRunId__idx";
