-- DropIndex
DROP INDEX "SupplierInvoice_sourcePurchaseOrderExecutionId_idx";

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "linkedSupplierTenantId" TEXT;

-- CreateIndex
CREATE INDEX "Supplier_linkedSupplierTenantId_idx" ON "Supplier"("linkedSupplierTenantId");

-- RenameIndex
ALTER INDEX "AuditEvent_tenant_action_occurredAt_idx" RENAME TO "AuditEvent_tenantId_action_occurredAt_idx";

-- RenameIndex
ALTER INDEX "EnterpriseProviderRecord_connection_object_external_key" RENAME TO "EnterpriseProviderRecord_connectionId_objectType_externalId_key";

-- RenameIndex
ALTER INDEX "EnterpriseProviderRecord_connection_seen_idx" RENAME TO "EnterpriseProviderRecord_connectionId_lastSeenAt_idx";

-- RenameIndex
ALTER INDEX "EnterpriseProviderRecord_tenant_provider_object_idx" RENAME TO "EnterpriseProviderRecord_tenantId_provider_objectType_idx";

-- RenameIndex
ALTER INDEX "TreasuryCloseCertification_tenant_period_key" RENAME TO "TreasuryCloseCertification_tenantId_periodStart_periodEnd_key";

-- RenameIndex
ALTER INDEX "TreasuryCloseCertification_tenant_status_period_idx" RENAME TO "TreasuryCloseCertification_tenantId_status_periodEnd_idx";

-- RenameIndex
ALTER INDEX "TreasuryConnectivityHealthIncident_integration_status_idx" RENAME TO "TreasuryConnectivityHealthIncident_integrationId_status_idx";

-- RenameIndex
ALTER INDEX "TreasuryConnectivityHealthIncident_key" RENAME TO "TreasuryConnectivityHealthIncident_incidentKey_key";

-- RenameIndex
ALTER INDEX "TreasuryConnectivityHealthIncident_link_status_idx" RENAME TO "TreasuryConnectivityHealthIncident_externalAccountLinkId_st_idx";

-- RenameIndex
ALTER INDEX "TreasuryConnectivityHealthIncident_tenant_status_severity_idx" RENAME TO "TreasuryConnectivityHealthIncident_tenantId_status_severity_idx";

-- RenameIndex
ALTER INDEX "TreasuryConnectivitySyncLog_event_key" RENAME TO "TreasuryConnectivitySyncLog_integrationEventId_key";

-- RenameIndex
ALTER INDEX "TreasuryConnectivitySyncLog_integration_status_processed_idx" RENAME TO "TreasuryConnectivitySyncLog_integrationId_status_processedA_idx";

-- RenameIndex
ALTER INDEX "TreasuryConnectivitySyncLog_tenant_processed_idx" RENAME TO "TreasuryConnectivitySyncLog_tenantId_processedAt_idx";

-- RenameIndex
ALTER INDEX "TreasuryExternalAccountLink_account_active_idx" RENAME TO "TreasuryExternalAccountLink_treasuryAccountId_active_idx";

-- RenameIndex
ALTER INDEX "TreasuryExternalAccountLink_integration_external_key" RENAME TO "TreasuryExternalAccountLink_integrationId_externalAccountId_key";

-- RenameIndex
ALTER INDEX "TreasuryExternalAccountLink_tenant_active_idx" RENAME TO "TreasuryExternalAccountLink_tenantId_active_idx";

-- RenameIndex
ALTER INDEX "TreasuryFxRate_pair_date_idx" RENAME TO "TreasuryFxRate_tenantId_fromCurrencyCode_toCurrencyCode_eff_idx";

-- RenameIndex
ALTER INDEX "TreasuryFxRate_pair_date_key" RENAME TO "TreasuryFxRate_tenantId_fromCurrencyCode_toCurrencyCode_eff_key";

-- RenameIndex
ALTER INDEX "TreasuryLiquidityAlert_tenant_breachDate_idx" RENAME TO "TreasuryLiquidityAlert_tenantId_breachDate_idx";

-- RenameIndex
ALTER INDEX "TreasuryLiquidityAlert_tenant_status_severity_idx" RENAME TO "TreasuryLiquidityAlert_tenantId_status_severity_idx";
