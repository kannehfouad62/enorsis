-- AlterTable
ALTER TABLE "ExecutiveBoardDelivery" ADD COLUMN     "accessExpiresAt" TIMESTAMP(3),
ADD COLUMN     "emailMessageId" TEXT,
ADD COLUMN     "lastAccessAt" TIMESTAMP(3);
