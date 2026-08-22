CREATE TABLE "BankReconciliationAutomationRule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "amountTolerance" DECIMAL(18,4) NOT NULL DEFAULT 0.005,
  "requireCurrencyMatch" BOOLEAN NOT NULL DEFAULT true,
  "maxDateVarianceDays" INTEGER NOT NULL DEFAULT 7,
  "allowPartialMatch" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BankReconciliationAutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankReconciliationAutomationRule_tenantId_name_key"
ON "BankReconciliationAutomationRule"("tenantId", "name");

CREATE INDEX "BankReconciliationAutomationRule_tenantId_active_name_idx"
ON "BankReconciliationAutomationRule"("tenantId", "active", "name");
