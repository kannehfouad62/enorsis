-- CreateEnum
CREATE TYPE "ContractAmendmentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXECUTED');

-- CreateTable
CREATE TABLE "ContractAmendment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "amendmentNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ContractAmendmentStatus" NOT NULL DEFAULT 'DRAFT',
    "effectiveDate" TIMESTAMP(3),
    "valueChange" DECIMAL(18,2),
    "createdByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractAmendment_contractId_status_idx" ON "ContractAmendment"("contractId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ContractAmendment_contractId_amendmentNumber_key" ON "ContractAmendment"("contractId", "amendmentNumber");

-- AddForeignKey
ALTER TABLE "ContractAmendment" ADD CONSTRAINT "ContractAmendment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
