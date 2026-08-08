CREATE TABLE "SupplierCollaborationInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "purchaseOrderRef" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "invoiceAmount" DECIMAL(18,2) NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "supplierEmail" TEXT,
    "notes" TEXT,
    "attachmentRef" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierCollaborationInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierCollaborationShipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseOrderRef" TEXT,
    "shipmentReference" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "carrierName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "origin" TEXT,
    "destination" TEXT,
    "estimatedDeliveryAt" TIMESTAMP(3),
    "actualDeliveryAt" TIMESTAMP(3),
    "supplierEmail" TEXT,
    "notes" TEXT,
    "proofOfDeliveryRef" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastStatusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierCollaborationShipment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierConversationThread" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "contextType" TEXT,
    "contextReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "buyerOwnerUserId" TEXT,
    "supplierEmail" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierConversationThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierConversationMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "senderId" TEXT,
    "senderEmail" TEXT,
    "body" TEXT NOT NULL,
    "attachmentRef" TEXT,
    "readByBuyerAt" TIMESTAMP(3),
    "readBySupplierAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierConversationMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupplierCollaborationInvoice_tenantId_supplierId_invoiceNumber_key"
ON "SupplierCollaborationInvoice"("tenantId", "supplierId", "invoiceNumber");

CREATE INDEX "SupplierCollaborationInvoice_tenantId_status_submittedAt_idx"
ON "SupplierCollaborationInvoice"("tenantId", "status", "submittedAt");

CREATE INDEX "SupplierCollaborationInvoice_supplierId_status_idx"
ON "SupplierCollaborationInvoice"("supplierId", "status");

CREATE INDEX "SupplierCollaborationInvoice_purchaseOrderRef_idx"
ON "SupplierCollaborationInvoice"("purchaseOrderRef");

CREATE UNIQUE INDEX "SupplierCollaborationShipment_tenantId_supplierId_shipmentReference_key"
ON "SupplierCollaborationShipment"("tenantId", "supplierId", "shipmentReference");

CREATE INDEX "SupplierCollaborationShipment_tenantId_status_estimatedDeliveryAt_idx"
ON "SupplierCollaborationShipment"("tenantId", "status", "estimatedDeliveryAt");

CREATE INDEX "SupplierCollaborationShipment_supplierId_status_idx"
ON "SupplierCollaborationShipment"("supplierId", "status");

CREATE INDEX "SupplierCollaborationShipment_purchaseOrderRef_idx"
ON "SupplierCollaborationShipment"("purchaseOrderRef");

CREATE INDEX "SupplierCollaborationShipment_trackingNumber_idx"
ON "SupplierCollaborationShipment"("trackingNumber");

CREATE INDEX "SupplierConversationThread_tenantId_status_lastMessageAt_idx"
ON "SupplierConversationThread"("tenantId", "status", "lastMessageAt");

CREATE INDEX "SupplierConversationThread_supplierId_status_idx"
ON "SupplierConversationThread"("supplierId", "status");

CREATE INDEX "SupplierConversationThread_contextType_contextReference_idx"
ON "SupplierConversationThread"("contextType", "contextReference");

CREATE INDEX "SupplierConversationMessage_tenantId_createdAt_idx"
ON "SupplierConversationMessage"("tenantId", "createdAt");

CREATE INDEX "SupplierConversationMessage_threadId_createdAt_idx"
ON "SupplierConversationMessage"("threadId", "createdAt");

ALTER TABLE "SupplierConversationMessage"
ADD CONSTRAINT "SupplierConversationMessage_threadId_fkey"
FOREIGN KEY ("threadId")
REFERENCES "SupplierConversationThread"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
