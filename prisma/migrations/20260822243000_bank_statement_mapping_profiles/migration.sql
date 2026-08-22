CREATE TABLE "BankStatementMappingProfile" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "providerName" TEXT,
  "referenceColumn" TEXT NOT NULL,
  "amountColumn" TEXT NOT NULL,
  "dateColumn" TEXT,
  "currencyColumn" TEXT,
  "descriptionColumn" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BankStatementMappingProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankStatementMappingProfile_tenantId_name_key"
ON "BankStatementMappingProfile"("tenantId", "name");

CREATE INDEX "BankStatementMappingProfile_tenantId_active_name_idx"
ON "BankStatementMappingProfile"("tenantId", "active", "name");
