-- CreateEnum
CREATE TYPE "ExecutiveSynthesisStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ExecutiveSynthesisRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runNumber" TEXT NOT NULL,
    "status" "ExecutiveSynthesisStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'OPENAI',
    "model" TEXT NOT NULL,
    "sourceInsightCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "initiatedByUserId" TEXT,
    "promptVersion" TEXT NOT NULL,
    "inputFingerprint" TEXT NOT NULL,
    "responseId" TEXT,
    "summary" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutiveSynthesisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutiveSynthesis" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "synthesisRunId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "executiveSummary" TEXT NOT NULL,
    "keyRisks" JSONB NOT NULL,
    "keyOpportunities" JSONB NOT NULL,
    "recommendedPriorities" JSONB NOT NULL,
    "governanceNotes" JSONB NOT NULL,
    "confidenceStatement" TEXT NOT NULL,
    "sourceInsightIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutiveSynthesis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExecutiveSynthesisRun_tenantId_status_createdAt_idx" ON "ExecutiveSynthesisRun"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ExecutiveSynthesisRun_inputFingerprint_idx" ON "ExecutiveSynthesisRun"("inputFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutiveSynthesisRun_tenantId_runNumber_key" ON "ExecutiveSynthesisRun"("tenantId", "runNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutiveSynthesis_synthesisRunId_key" ON "ExecutiveSynthesis"("synthesisRunId");

-- CreateIndex
CREATE INDEX "ExecutiveSynthesis_tenantId_createdAt_idx" ON "ExecutiveSynthesis"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "ExecutiveSynthesisRun" ADD CONSTRAINT "ExecutiveSynthesisRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveSynthesis" ADD CONSTRAINT "ExecutiveSynthesis_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutiveSynthesis" ADD CONSTRAINT "ExecutiveSynthesis_synthesisRunId_fkey" FOREIGN KEY ("synthesisRunId") REFERENCES "ExecutiveSynthesisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
