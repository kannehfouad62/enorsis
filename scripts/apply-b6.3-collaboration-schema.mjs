#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model SupplierSharedDocument")) {
  console.log("B6.3 collaboration schema already present.");
  process.exit(0);
}

schema += `

model SupplierSharedDocument {
  id               String   @id @default(cuid())
  tenantId         String
  supplierId       String
  title            String
  description      String?
  documentRef      String
  documentType     String?
  direction        String   @default("BUYER_TO_SUPPLIER")
  status           String   @default("SHARED")
  sharedByUserId   String?
  supplierEmail    String?
  sharedAt         DateTime @default(now())
  acknowledgedAt   DateTime?
  acknowledgedBy   String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([tenantId, supplierId, status])
  @@index([supplierId, sharedAt])
  @@index([documentRef])
}

model SupplierActionRequest {
  id                 String   @id @default(cuid())
  tenantId           String
  supplierId         String
  requestType        String
  title              String
  description        String?
  contextType        String?
  contextReference   String?
  priority           String   @default("NORMAL")
  status             String   @default("OPEN")
  supplierEmail      String?
  dueAt              DateTime?
  requestedByUserId  String?
  requestedAt        DateTime @default(now())
  respondedAt        DateTime?
  responseText       String?
  responseDocumentRef String?
  reviewedByUserId   String?
  reviewedAt         DateTime?
  reviewNotes        String?
  completedAt        DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([tenantId, supplierId, status])
  @@index([tenantId, dueAt, status])
  @@index([supplierId, requestedAt])
  @@index([contextType, contextReference])
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B6.3 shared document and supplier action request schema.");
