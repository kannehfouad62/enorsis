CREATE TYPE "BankReconciliationStatus" AS ENUM (
  'MATCHED',
  'PARTIAL',
  'UNMATCHED',
  'DUPLICATE'
);

CREATE TABLE "BankPaymentReconciliation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "paymentBatchId" TEXT NOT NULL,
  "statementReference" TEXT NOT NULL,
  "bankReference" TEXT,
  "currencyCode" TEXT NOT NULL,
  "expectedAmount" DECIMAL(20,4) NOT NULL,
  "settledAmount" DECIMAL(20,4) NOT NULL,
  "status" "BankReconciliationStatus" NOT NULL,
  "reconciliationDate" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "recordedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BankPaymentReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankPaymentReconciliation_paymentBatchId_key"
ON "BankPaymentReconciliation"("paymentBatchId");

CREATE INDEX "BankPaymentReconciliation_tenantId_status_idx"
ON "BankPaymentReconciliation"("tenantId", "status");

CREATE INDEX "BankPaymentReconciliation_tenantId_reconciliationDate_idx"
ON "BankPaymentReconciliation"("tenantId", "reconciliationDate");

CREATE INDEX "BankPaymentReconciliation_statementReference_idx"
ON "BankPaymentReconciliation"("statementReference");

CREATE INDEX "BankPaymentReconciliation_bankReference_idx"
ON "BankPaymentReconciliation"("bankReference");
