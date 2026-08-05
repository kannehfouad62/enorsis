-- CreateEnum
CREATE TYPE "CommercialEditionCode" AS ENUM ('COMMUNITY', 'PROFESSIONAL', 'ENTERPRISE_SAAS', 'MANAGED_PAAS');

-- CreateEnum
CREATE TYPE "TenantSubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EntitlementEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "UsageMetricPeriod" AS ENUM ('LIFETIME', 'DAILY', 'MONTHLY', 'ANNUAL');

-- CreateTable
CREATE TABLE "CommercialEdition" (
    "id" TEXT NOT NULL,
    "code" "CommercialEditionCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialEdition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFeature" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "groupKey" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "managedPaaSOnly" BOOLEAN NOT NULL DEFAULT false,
    "aiFeature" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditionFeature" (
    "id" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditionFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "editionId" TEXT NOT NULL,
    "status" "TenantSubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3),
    "renewsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "externalCustomerId" TEXT,
    "externalSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantEntitlement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "effect" "EntitlementEffect" NOT NULL DEFAULT 'ALLOW',
    "reason" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "grantedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsagePolicy" (
    "id" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "editionId" TEXT,
    "metricKey" TEXT NOT NULL,
    "period" "UsageMetricPeriod" NOT NULL,
    "hardLimit" BIGINT,
    "warningLimit" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsagePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageCounter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "period" "UsageMetricPeriod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3),
    "value" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommercialEdition_code_key" ON "CommercialEdition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformFeature_key_key" ON "PlatformFeature"("key");

-- CreateIndex
CREATE INDEX "PlatformFeature_groupKey_active_idx" ON "PlatformFeature"("groupKey", "active");

-- CreateIndex
CREATE UNIQUE INDEX "EditionFeature_editionId_featureId_key" ON "EditionFeature"("editionId", "featureId");

-- CreateIndex
CREATE INDEX "TenantSubscription_tenantId_status_idx" ON "TenantSubscription"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TenantEntitlement_tenantId_featureId_key" ON "TenantEntitlement"("tenantId", "featureId");

-- CreateIndex
CREATE UNIQUE INDEX "UsagePolicy_featureId_editionId_metricKey_period_key" ON "UsagePolicy"("featureId", "editionId", "metricKey", "period");

-- CreateIndex
CREATE UNIQUE INDEX "UsageCounter_tenantId_featureId_metricKey_period_periodStar_key" ON "UsageCounter"("tenantId", "featureId", "metricKey", "period", "periodStart");

-- AddForeignKey
ALTER TABLE "EditionFeature" ADD CONSTRAINT "EditionFeature_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "CommercialEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditionFeature" ADD CONSTRAINT "EditionFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "PlatformFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "CommercialEdition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantEntitlement" ADD CONSTRAINT "TenantEntitlement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantEntitlement" ADD CONSTRAINT "TenantEntitlement_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "PlatformFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsagePolicy" ADD CONSTRAINT "UsagePolicy_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "PlatformFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsagePolicy" ADD CONSTRAINT "UsagePolicy_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "CommercialEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageCounter" ADD CONSTRAINT "UsageCounter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageCounter" ADD CONSTRAINT "UsageCounter_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "PlatformFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
