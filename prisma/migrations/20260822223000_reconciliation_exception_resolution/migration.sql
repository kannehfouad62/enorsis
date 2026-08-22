CREATE TYPE "BankReconciliationResolutionStatus" AS ENUM (
  'OPEN',
  'ACKNOWLEDGED',
  'INVESTIGATING',
  'RESOLVED'
);

ALTER TABLE "BankPaymentReconciliation"
ADD COLUMN "resolutionStatus" "BankReconciliationResolutionStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN "resolutionNotes" TEXT,
ADD COLUMN "resolvedByUserId" TEXT,
ADD COLUMN "resolvedAt" TIMESTAMP(3);

UPDATE "BankPaymentReconciliation"
SET
  "resolutionStatus" = 'RESOLVED',
  "resolvedByUserId" = "recordedByUserId",
  "resolvedAt" = "createdAt"
WHERE "status" = 'MATCHED';

CREATE INDEX "BankPaymentReconciliation_tenantId_resolutionStatus_idx"
ON "BankPaymentReconciliation"("tenantId", "resolutionStatus");
