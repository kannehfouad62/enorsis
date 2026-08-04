-- CreateEnum
CREATE TYPE "AccessReviewStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccessReviewItemStatus" AS ENUM ('PENDING', 'CERTIFIED', 'REVOKE_REQUESTED', 'ROLE_CHANGE_REQUESTED', 'EXCEPTION_APPROVED', 'REMEDIATED');

-- CreateEnum
CREATE TYPE "AccessReviewDecision" AS ENUM ('CERTIFY', 'REVOKE', 'CHANGE_ROLE', 'APPROVE_EXCEPTION');

-- CreateEnum
CREATE TYPE "SodRuleStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SodViolationStatus" AS ENUM ('OPEN', 'EXCEPTION_APPROVED', 'REMEDIATION_REQUIRED', 'REMEDIATED', 'DISMISSED');

-- CreateTable
CREATE TABLE "AccessReviewCampaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "AccessReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewerUserId" TEXT NOT NULL,
    "scopeRoles" TEXT[],
    "scopeUserIds" TEXT[],
    "dueAt" TIMESTAMP(3) NOT NULL,
    "launchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessReviewCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessReviewItem" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userName" TEXT,
    "currentRoles" TEXT[],
    "requestedRoles" TEXT[],
    "status" "AccessReviewItemStatus" NOT NULL DEFAULT 'PENDING',
    "decision" "AccessReviewDecision",
    "decisionComments" TEXT,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "remediatedByUserId" TEXT,
    "remediatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SodRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "SodRuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "conflictingRoleA" TEXT NOT NULL,
    "conflictingRoleB" TEXT NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 3,
    "remediationGuidance" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SodRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SodViolation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sodRuleId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userName" TEXT,
    "detectedRoles" TEXT[],
    "status" "SodViolationStatus" NOT NULL DEFAULT 'OPEN',
    "exceptionReason" TEXT,
    "exceptionExpiresAt" TIMESTAMP(3),
    "remediationNotes" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "remediatedByUserId" TEXT,
    "remediatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SodViolation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccessReviewCampaign_tenantId_status_dueAt_idx" ON "AccessReviewCampaign"("tenantId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "AccessReviewCampaign_reviewerUserId_status_idx" ON "AccessReviewCampaign"("reviewerUserId", "status");

-- CreateIndex
CREATE INDEX "AccessReviewItem_campaignId_status_idx" ON "AccessReviewItem"("campaignId", "status");

-- CreateIndex
CREATE INDEX "AccessReviewItem_userId_status_idx" ON "AccessReviewItem"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AccessReviewItem_campaignId_membershipId_key" ON "AccessReviewItem"("campaignId", "membershipId");

-- CreateIndex
CREATE INDEX "SodRule_tenantId_status_severity_idx" ON "SodRule"("tenantId", "status", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "SodRule_tenantId_key_key" ON "SodRule"("tenantId", "key");

-- CreateIndex
CREATE INDEX "SodViolation_tenantId_status_createdAt_idx" ON "SodViolation"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SodViolation_userId_status_idx" ON "SodViolation"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SodViolation_sodRuleId_membershipId_key" ON "SodViolation"("sodRuleId", "membershipId");

-- AddForeignKey
ALTER TABLE "AccessReviewCampaign" ADD CONSTRAINT "AccessReviewCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessReviewItem" ADD CONSTRAINT "AccessReviewItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AccessReviewCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SodRule" ADD CONSTRAINT "SodRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SodViolation" ADD CONSTRAINT "SodViolation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SodViolation" ADD CONSTRAINT "SodViolation_sodRuleId_fkey" FOREIGN KEY ("sodRuleId") REFERENCES "SodRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
