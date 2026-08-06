-- CreateEnum
CREATE TYPE "EnterpriseActivityVisibility" AS ENUM ('TENANT', 'RESTRICTED', 'PRIVATE', 'PLATFORM');

-- CreateEnum
CREATE TYPE "EnterpriseActivitySeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateTable
CREATE TABLE "EnterpriseActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "sourceModule" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "EnterpriseActivitySeverity" NOT NULL DEFAULT 'INFO',
    "visibility" "EnterpriseActivityVisibility" NOT NULL DEFAULT 'TENANT',
    "actorUserId" TEXT,
    "actorName" TEXT,
    "actorRole" TEXT,
    "subjectType" TEXT,
    "subjectId" TEXT,
    "subjectLabel" TEXT,
    "parentType" TEXT,
    "parentId" TEXT,
    "actionUrl" TEXT,
    "eventId" TEXT,
    "correlationId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseActivityAccessRule" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userId" TEXT,
    "role" TEXT,
    "serviceKey" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseActivityAccessRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnterpriseActivity_tenantId_occurredAt_idx" ON "EnterpriseActivity"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "EnterpriseActivity_tenantId_activityType_occurredAt_idx" ON "EnterpriseActivity"("tenantId", "activityType", "occurredAt");

-- CreateIndex
CREATE INDEX "EnterpriseActivity_subjectType_subjectId_occurredAt_idx" ON "EnterpriseActivity"("subjectType", "subjectId", "occurredAt");

-- CreateIndex
CREATE INDEX "EnterpriseActivity_actorUserId_occurredAt_idx" ON "EnterpriseActivity"("actorUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "EnterpriseActivity_correlationId_idx" ON "EnterpriseActivity"("correlationId");

-- CreateIndex
CREATE INDEX "EnterpriseActivity_eventId_idx" ON "EnterpriseActivity"("eventId");

-- CreateIndex
CREATE INDEX "EnterpriseActivityAccessRule_activityId_active_idx" ON "EnterpriseActivityAccessRule"("activityId", "active");

-- CreateIndex
CREATE INDEX "EnterpriseActivityAccessRule_userId_active_idx" ON "EnterpriseActivityAccessRule"("userId", "active");

-- CreateIndex
CREATE INDEX "EnterpriseActivityAccessRule_role_active_idx" ON "EnterpriseActivityAccessRule"("role", "active");

-- AddForeignKey
ALTER TABLE "EnterpriseActivity" ADD CONSTRAINT "EnterpriseActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseActivityAccessRule" ADD CONSTRAINT "EnterpriseActivityAccessRule_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "EnterpriseActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
