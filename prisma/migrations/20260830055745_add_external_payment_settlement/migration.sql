-- CreateEnum
CREATE TYPE "PaymentSettlementChannel" AS ENUM ('ENORSIS_NATIVE', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "PaymentSettlementStatus" AS ENUM ('BUYER_RECORDED', 'AWAITING_SUPPLIER_CONFIRMATION', 'CONFIRMED', 'DISPUTED', 'CONFIRMATION_OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExternalPaymentMethod" AS ENUM ('ACH', 'WIRE_TRANSFER', 'BANK_TRANSFER', 'CHECK', 'CARD', 'ERP_PAYMENT', 'TREASURY_PLATFORM', 'MOBILE_MONEY', 'CASH', 'OTHER');

-- AlterTable
ALTER TABLE "ApPaymentReadinessCase" ADD COLUMN     "settlementChannel" "PaymentSettlementChannel";

-- CreateTable
CREATE TABLE "PaymentSettlement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sellerTenantId" TEXT,
    "supplierInvoiceId" TEXT NOT NULL,
    "readinessCaseId" TEXT,
    "paymentBatchId" TEXT,
    "channel" "PaymentSettlementChannel" NOT NULL,
    "status" "PaymentSettlementStatus" NOT NULL DEFAULT 'BUYER_RECORDED',
    "currencyCode" TEXT NOT NULL,
    "invoiceAmount" DECIMAL(18,2) NOT NULL,
    "paymentAmount" DECIMAL(18,2) NOT NULL,
    "usdEquivalent" DECIMAL(18,2) NOT NULL,
    "externalPaymentMethod" "ExternalPaymentMethod",
    "externalSystemName" TEXT,
    "paymentReference" TEXT,
    "paymentDate" TIMESTAMP(3),
    "evidenceReference" TEXT,
    "buyerRecordedByUserId" TEXT,
    "buyerRecordedAt" TIMESTAMP(3),
    "supplierConfirmedByUserId" TEXT,
    "supplierConfirmedAt" TIMESTAMP(3),
    "supplierDisputedByUserId" TEXT,
    "supplierDisputedAt" TIMESTAMP(3),
    "disputeReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentSettlement_tenantId_status_createdAt_idx" ON "PaymentSettlement"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentSettlement_sellerTenantId_status_createdAt_idx" ON "PaymentSettlement"("sellerTenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentSettlement_supplierInvoiceId_status_idx" ON "PaymentSettlement"("supplierInvoiceId", "status");

-- CreateIndex
CREATE INDEX "PaymentSettlement_readinessCaseId_idx" ON "PaymentSettlement"("readinessCaseId");

-- CreateIndex
CREATE INDEX "PaymentSettlement_paymentBatchId_idx" ON "PaymentSettlement"("paymentBatchId");

-- CreateIndex
CREATE INDEX "PaymentSettlement_paymentReference_idx" ON "PaymentSettlement"("paymentReference");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSettlement_tenantId_supplierInvoiceId_paymentReferen_key" ON "PaymentSettlement"("tenantId", "supplierInvoiceId", "paymentReference");

-- CreateIndex
CREATE INDEX "ApPaymentReadinessCase_settlementChannel_status_idx" ON "ApPaymentReadinessCase"("settlementChannel", "status");
