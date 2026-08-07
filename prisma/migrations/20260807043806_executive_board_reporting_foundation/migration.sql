-- CreateEnum
CREATE TYPE "ExecutiveBoardPackType" AS ENUM ('CEO', 'CFO', 'COO', 'CPO', 'CRO', 'ESG', 'SUPPLY_CHAIN', 'GENERAL_BOARD');

-- CreateEnum
CREATE TYPE "ExecutiveBoardPackStatus" AS ENUM ('DRAFT', 'GENERATED', 'FINALIZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExecutiveBoardPackPeriodType" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'AD_HOC');

-- CreateTable
CREATE TABLE "ExecutiveBoardPackDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "definitionKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "packType" "ExecutiveBoardPackType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "defaultPeriodType" "ExecutiveBoardPackPeriodType" NOT NULL,
    "includeAiSynthesis" BOOLEAN NOT NULL DEFAULT true,
    "includeGovernance" BOOLEAN NOT NULL DEFAULT true,
    "includeKpis" BOOLEAN NOT NULL DEFAULT true,
    "includeRisks" BOOLEAN NOT NULL DEFAULT true,
    "includeOpportunities" BOOLEAN NOT NULL DEFAULT true,
    "sectionConfiguration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutiveBoardPackDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutiveBoardPack" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "packNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "packType" "ExecutiveBoardPackType" NOT NULL,
    "status" "ExecutiveBoardPackStatus" NOT NULL DEFAULT 'DRAFT',
    "periodType" "ExecutiveBoardPackPeriodType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3),
    "generatedByUserId" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "finalizedByUserId" TEXT,
    "executiveSummary" TEXT,
    "sourceSnapshot" JSONB NOT NULL,
    "sectionSnapshot" JSONB NOT NULL,
    "governanceSnapshot" JSONB NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutiveBoardPack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExecutiveBoardPackDefinition_tenantId_packType_active_idx" ON "ExecutiveBoardPackDefinition"("tenantId", "packType", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutiveBoardPackDefinition_tenantId_definitionKey_key" ON "ExecutiveBoardPackDefinition"("tenantId", "definitionKey");

-- CreateIndex
CREATE INDEX "ExecutiveBoardPack_tenantId_packType_status_periodEnd_idx" ON "ExecutiveBoardPack"("tenantId", "packType", "status", "periodEnd");

-- CreateIndex
CREATE INDEX "ExecutiveBoardPack_definitionId_createdAt_idx" ON "ExecutiveBoardPack"("definitionId", "createdAt");

-- CreateIndex
CREATE INDEX "ExecutiveBoardPack_sourceFingerprint_idx" ON "ExecutiveBoardPack"("sourceFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutiveBoardPack_tenantId_packNumber_key" ON "ExecutiveBoardPack"("tenantId", "packNumber");

-- AddForeignKey
ALTER TABLE "ExecutiveBoardPackDefinition" ADD CONSTRAINT "ExecutiveBoardPackDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveBoardPack" ADD CONSTRAINT "ExecutiveBoardPack_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveBoardPack" ADD CONSTRAINT "ExecutiveBoardPack_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "ExecutiveBoardPackDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
