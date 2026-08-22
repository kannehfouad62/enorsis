CREATE TYPE "BankStatementImportStatus" AS ENUM (
  'PROCESSED',
  'PARTIAL',
  'FAILED'
);

CREATE TYPE "BankStatementRowStatus" AS ENUM (
  'MATCHED',
  'PARTIAL',
  'UNMATCHED',
  'DUPLICATE',
  'INVALID'
);

CREATE TABLE "BankStatementImport" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "statementReference" TEXT NOT NULL,
  "status" "BankStatementImportStatus" NOT NULL,
  "totalRows" INTEGER NOT NULL,
  "matchedRows" INTEGER NOT NULL DEFAULT 0,
  "exceptionRows" INTEGER NOT NULL DEFAULT 0,
  "importedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BankStatementImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BankStatementImportRow" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "importId" TEXT NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "transactionDate" TIMESTAMP(3),
  "reference" TEXT,
  "description" TEXT,
  "currencyCode" TEXT,
  "amount" DECIMAL(20,4),
  "status" "BankStatementRowStatus" NOT NULL,
  "paymentBatchId" TEXT,
  "reconciliationId" TEXT,
  "exceptionReason" TEXT,
  "rawData" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankStatementImportRow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BankStatementImport_tenantId_createdAt_idx"
ON "BankStatementImport"("tenantId", "createdAt");

CREATE INDEX "BankStatementImport_tenantId_status_idx"
ON "BankStatementImport"("tenantId", "status");

CREATE INDEX "BankStatementImportRow_tenantId_importId_idx"
ON "BankStatementImportRow"("tenantId", "importId");

CREATE INDEX "BankStatementImportRow_tenantId_status_idx"
ON "BankStatementImportRow"("tenantId", "status");

CREATE INDEX "BankStatementImportRow_reference_idx"
ON "BankStatementImportRow"("reference");

CREATE INDEX "BankStatementImportRow_paymentBatchId_idx"
ON "BankStatementImportRow"("paymentBatchId");
