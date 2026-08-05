-- CreateEnum
CREATE TYPE "TenantEnvironmentType" AS ENUM ('SHARED_SAAS', 'DEDICATED_SAAS', 'MANAGED_PAAS', 'SELF_HOSTED');

-- CreateEnum
CREATE TYPE "TenantDataResidency" AS ENUM ('UNITED_STATES', 'CANADA', 'EUROPEAN_UNION', 'UNITED_KINGDOM', 'AUSTRALIA', 'SINGAPORE', 'GLOBAL', 'CUSTOM');

-- CreateTable
CREATE TABLE "TenantConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "environmentType" "TenantEnvironmentType" NOT NULL DEFAULT 'SHARED_SAAS',
    "dataResidency" "TenantDataResidency" NOT NULL DEFAULT 'UNITED_STATES',
    "customResidencyRegion" TEXT,
    "displayName" TEXT,
    "legalName" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "customDomain" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "defaultCurrencyCode" TEXT NOT NULL DEFAULT 'USD',
    "fiscalYearStartMonth" INTEGER NOT NULL DEFAULT 1,
    "dateFormat" TEXT NOT NULL DEFAULT 'MM/dd/yyyy',
    "numberFormat" TEXT NOT NULL DEFAULT 'en-US',
    "weekStartsOn" INTEGER NOT NULL DEFAULT 1,
    "requireMfa" BOOLEAN NOT NULL DEFAULT false,
    "enforceSso" BOOLEAN NOT NULL DEFAULT false,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 480,
    "passwordMinLength" INTEGER NOT NULL DEFAULT 12,
    "documentRetentionDays" INTEGER NOT NULL DEFAULT 2555,
    "auditRetentionDays" INTEGER NOT NULL DEFAULT 2555,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "inAppNotifications" BOOLEAN NOT NULL DEFAULT true,
    "dailyDigestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyDigestHour" INTEGER NOT NULL DEFAULT 8,
    "maxUsers" INTEGER,
    "maxSuppliers" INTEGER,
    "maxStorageMb" BIGINT,
    "maxApiRequestsPerMonth" BIGINT,
    "supportTier" TEXT NOT NULL DEFAULT 'STANDARD',
    "maintenanceWindow" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantConfiguration_tenantId_key" ON "TenantConfiguration"("tenantId");

-- CreateIndex
CREATE INDEX "TenantConfiguration_environmentType_dataResidency_idx" ON "TenantConfiguration"("environmentType", "dataResidency");

-- AddForeignKey
ALTER TABLE "TenantConfiguration" ADD CONSTRAINT "TenantConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
