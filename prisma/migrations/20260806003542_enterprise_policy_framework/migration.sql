-- CreateEnum
CREATE TYPE "EnterprisePolicyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "EnterprisePolicyValueType" AS ENUM ('BOOLEAN', 'STRING', 'NUMBER', 'JSON');

-- CreateEnum
CREATE TYPE "EnterpriseFeatureFlagStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'RETIRED');

-- CreateTable
CREATE TABLE "EnterprisePolicyDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "moduleKey" TEXT,
    "valueType" "EnterprisePolicyValueType" NOT NULL,
    "defaultValue" JSONB NOT NULL,
    "validationSchema" JSONB,
    "status" "EnterprisePolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "managedByPlatform" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterprisePolicyDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseTenantPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "policyDefinitionId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "reason" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseTenantPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseFeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "moduleKey" TEXT,
    "status" "EnterpriseFeatureFlagStatus" NOT NULL DEFAULT 'DRAFT',
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 0,
    "managedPaaSOnly" BOOLEAN NOT NULL DEFAULT false,
    "requiresFeatureKey" TEXT,
    "rules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseFeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseTenantFeatureFlag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "featureFlagId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "reason" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseTenantFeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnterprisePolicyDefinition_key_key" ON "EnterprisePolicyDefinition"("key");

-- CreateIndex
CREATE INDEX "EnterprisePolicyDefinition_category_status_idx" ON "EnterprisePolicyDefinition"("category", "status");

-- CreateIndex
CREATE INDEX "EnterprisePolicyDefinition_moduleKey_status_idx" ON "EnterprisePolicyDefinition"("moduleKey", "status");

-- CreateIndex
CREATE INDEX "EnterpriseTenantPolicy_tenantId_active_idx" ON "EnterpriseTenantPolicy"("tenantId", "active");

-- CreateIndex
CREATE INDEX "EnterpriseTenantPolicy_effectiveFrom_effectiveUntil_idx" ON "EnterpriseTenantPolicy"("effectiveFrom", "effectiveUntil");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseTenantPolicy_tenantId_policyDefinitionId_key" ON "EnterpriseTenantPolicy"("tenantId", "policyDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseFeatureFlag_key_key" ON "EnterpriseFeatureFlag"("key");

-- CreateIndex
CREATE INDEX "EnterpriseFeatureFlag_moduleKey_status_idx" ON "EnterpriseFeatureFlag"("moduleKey", "status");

-- CreateIndex
CREATE INDEX "EnterpriseFeatureFlag_managedPaaSOnly_status_idx" ON "EnterpriseFeatureFlag"("managedPaaSOnly", "status");

-- CreateIndex
CREATE INDEX "EnterpriseTenantFeatureFlag_tenantId_enabled_idx" ON "EnterpriseTenantFeatureFlag"("tenantId", "enabled");

-- CreateIndex
CREATE INDEX "EnterpriseTenantFeatureFlag_startsAt_expiresAt_idx" ON "EnterpriseTenantFeatureFlag"("startsAt", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseTenantFeatureFlag_tenantId_featureFlagId_key" ON "EnterpriseTenantFeatureFlag"("tenantId", "featureFlagId");

-- AddForeignKey
ALTER TABLE "EnterpriseTenantPolicy" ADD CONSTRAINT "EnterpriseTenantPolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseTenantPolicy" ADD CONSTRAINT "EnterpriseTenantPolicy_policyDefinitionId_fkey" FOREIGN KEY ("policyDefinitionId") REFERENCES "EnterprisePolicyDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseTenantFeatureFlag" ADD CONSTRAINT "EnterpriseTenantFeatureFlag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseTenantFeatureFlag" ADD CONSTRAINT "EnterpriseTenantFeatureFlag_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "EnterpriseFeatureFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
