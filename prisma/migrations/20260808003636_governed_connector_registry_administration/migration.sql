-- AlterTable
ALTER TABLE "EnterpriseAutomationConnector" ADD COLUMN     "lastTestMessage" TEXT,
ADD COLUMN     "lastTestStatus" TEXT,
ADD COLUMN     "lastTestedAt" TIMESTAMP(3),
ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0;
