-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EnterpriseAutomationRuntimeSignalType" ADD VALUE 'RETRY';
ALTER TYPE "EnterpriseAutomationRuntimeSignalType" ADD VALUE 'RECOVER';

-- AlterTable
ALTER TABLE "EnterpriseAutomationRuntimeExecution" ADD COLUMN     "lastRecoveredAt" TIMESTAMP(3),
ADD COLUMN     "recoveredByUserId" TEXT,
ADD COLUMN     "recoveryCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EnterpriseAutomationRuntimeNode" ADD COLUMN     "failureCode" TEXT,
ADD COLUMN     "retryDelayMinutes" INTEGER;
