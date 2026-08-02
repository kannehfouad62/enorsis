-- CreateEnum
CREATE TYPE "AiExecutionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AiReviewStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AiCapability" AS ENUM ('PROCUREMENT_COPILOT', 'RFX_DRAFT', 'SUPPLIER_ANALYSIS', 'CONTRACT_REVIEW', 'NEGOTIATION_ADVISOR', 'SPEND_ANALYSIS', 'RISK_BRIEF', 'EXECUTIVE_BRIEF');

-- CreateTable
CREATE TABLE "AiPromptTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "key" TEXT NOT NULL,
    "capability" "AiCapability" NOT NULL,
    "name" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresReview" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiExecution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "capability" "AiCapability" NOT NULL,
    "promptTemplateId" TEXT,
    "promptVersion" INTEGER,
    "model" TEXT NOT NULL,
    "inputText" TEXT NOT NULL,
    "outputText" TEXT,
    "status" "AiExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewStatus" "AiReviewStatus" NOT NULL DEFAULT 'PENDING',
    "confidence" INTEGER,
    "evidence" JSONB,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "latencyMs" INTEGER,
    "errorMessage" TEXT,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "completedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiPromptTemplate_tenantId_capability_isActive_idx" ON "AiPromptTemplate"("tenantId", "capability", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AiPromptTemplate_tenantId_key_version_key" ON "AiPromptTemplate"("tenantId", "key", "version");

-- CreateIndex
CREATE INDEX "AiExecution_tenantId_capability_createdAt_idx" ON "AiExecution"("tenantId", "capability", "createdAt");

-- CreateIndex
CREATE INDEX "AiExecution_tenantId_reviewStatus_createdAt_idx" ON "AiExecution"("tenantId", "reviewStatus", "createdAt");

-- CreateIndex
CREATE INDEX "AiExecution_userId_createdAt_idx" ON "AiExecution"("userId", "createdAt");
