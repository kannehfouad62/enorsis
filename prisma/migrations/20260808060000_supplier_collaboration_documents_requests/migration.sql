CREATE TABLE "SupplierSharedDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "documentRef" TEXT NOT NULL,
    "documentType" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'BUYER_TO_SUPPLIER',
    "status" TEXT NOT NULL DEFAULT 'SHARED',
    "sharedByUserId" TEXT,
    "supplierEmail" TEXT,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierSharedDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierActionRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contextType" TEXT,
    "contextReference" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "supplierEmail" TEXT,
    "dueAt" TIMESTAMP(3),
    "requestedByUserId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "responseText" TEXT,
    "responseDocumentRef" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierActionRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupplierSharedDocument_tenantId_supplierId_status_idx"
ON "SupplierSharedDocument"("tenantId", "supplierId", "status");

CREATE INDEX "SupplierSharedDocument_supplierId_sharedAt_idx"
ON "SupplierSharedDocument"("supplierId", "sharedAt");

CREATE INDEX "SupplierSharedDocument_documentRef_idx"
ON "SupplierSharedDocument"("documentRef");

CREATE INDEX "SupplierActionRequest_tenantId_supplierId_status_idx"
ON "SupplierActionRequest"("tenantId", "supplierId", "status");

CREATE INDEX "SupplierActionRequest_tenantId_dueAt_status_idx"
ON "SupplierActionRequest"("tenantId", "dueAt", "status");

CREATE INDEX "SupplierActionRequest_supplierId_requestedAt_idx"
ON "SupplierActionRequest"("supplierId", "requestedAt");

CREATE INDEX "SupplierActionRequest_contextType_contextReference_idx"
ON "SupplierActionRequest"("contextType", "contextReference");
