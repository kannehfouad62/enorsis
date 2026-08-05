-- CreateEnum
CREATE TYPE "SupplierPortalInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SupplierPortalUserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SupplierQuestionnaireStatus" AS ENUM ('DRAFT', 'SENT', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SupplierPortalTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierPortalMessageDirection" AS ENUM ('BUYER_TO_SUPPLIER', 'SUPPLIER_TO_BUYER', 'INTERNAL');

-- CreateTable
CREATE TABLE "SupplierPortalInvitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT,
    "email" TEXT NOT NULL,
    "contactName" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "SupplierPortalInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedByUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPortalInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPortalUser" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "jobTitle" TEXT,
    "phone" TEXT,
    "status" "SupplierPortalUserStatus" NOT NULL DEFAULT 'INVITED',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPortalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierOnboardingQuestionnaire" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SupplierQuestionnaireStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "questions" JSONB NOT NULL,
    "answers" JSONB,
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierOnboardingQuestionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPortalTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SupplierPortalTaskStatus" NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "buyerOwnerUserId" TEXT NOT NULL,
    "supplierOwnerEmail" TEXT,
    "blocker" TEXT,
    "completionEvidence" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPortalTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPortalMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "direction" "SupplierPortalMessageDirection" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorEmail" TEXT,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPortalMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPortalInvitation_tokenHash_key" ON "SupplierPortalInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "SupplierPortalInvitation_tenantId_status_expiresAt_idx" ON "SupplierPortalInvitation"("tenantId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "SupplierPortalInvitation_supplierId_status_idx" ON "SupplierPortalInvitation"("supplierId", "status");

-- CreateIndex
CREATE INDEX "SupplierPortalInvitation_email_status_idx" ON "SupplierPortalInvitation"("email", "status");

-- CreateIndex
CREATE INDEX "SupplierPortalUser_tenantId_status_idx" ON "SupplierPortalUser"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SupplierPortalUser_supplierId_status_idx" ON "SupplierPortalUser"("supplierId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPortalUser_tenantId_supplierId_email_key" ON "SupplierPortalUser"("tenantId", "supplierId", "email");

-- CreateIndex
CREATE INDEX "SupplierOnboardingQuestionnaire_tenantId_status_dueAt_idx" ON "SupplierOnboardingQuestionnaire"("tenantId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "SupplierOnboardingQuestionnaire_supplierId_status_idx" ON "SupplierOnboardingQuestionnaire"("supplierId", "status");

-- CreateIndex
CREATE INDEX "SupplierPortalTask_tenantId_status_dueAt_idx" ON "SupplierPortalTask"("tenantId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "SupplierPortalTask_supplierId_status_idx" ON "SupplierPortalTask"("supplierId", "status");

-- CreateIndex
CREATE INDEX "SupplierPortalMessage_tenantId_supplierId_createdAt_idx" ON "SupplierPortalMessage"("tenantId", "supplierId", "createdAt");

-- CreateIndex
CREATE INDEX "SupplierPortalMessage_relatedType_relatedId_idx" ON "SupplierPortalMessage"("relatedType", "relatedId");

-- AddForeignKey
ALTER TABLE "SupplierPortalInvitation" ADD CONSTRAINT "SupplierPortalInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPortalInvitation" ADD CONSTRAINT "SupplierPortalInvitation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPortalUser" ADD CONSTRAINT "SupplierPortalUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPortalUser" ADD CONSTRAINT "SupplierPortalUser_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOnboardingQuestionnaire" ADD CONSTRAINT "SupplierOnboardingQuestionnaire_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOnboardingQuestionnaire" ADD CONSTRAINT "SupplierOnboardingQuestionnaire_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPortalTask" ADD CONSTRAINT "SupplierPortalTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPortalTask" ADD CONSTRAINT "SupplierPortalTask_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPortalMessage" ADD CONSTRAINT "SupplierPortalMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPortalMessage" ADD CONSTRAINT "SupplierPortalMessage_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
