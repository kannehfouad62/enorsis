#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model SupplierCollaborationInvoice")) {
  console.log("Supplier Collaboration schema already present.");
  process.exit(0);
}

schema += `

model SupplierCollaborationInvoice {
  id               String   @id @default(cuid())
  tenantId         String
  supplierId       String
  invoiceNumber    String
  purchaseOrderRef String?
  currencyCode     String   @default("USD")
  invoiceAmount    Decimal  @db.Decimal(18, 2)
  invoiceDate      DateTime
  dueDate          DateTime?
  status           String   @default("SUBMITTED")
  supplierEmail    String?
  notes            String?
  attachmentRef    String?
  submittedAt      DateTime @default(now())
  reviewedByUserId String?
  reviewedAt       DateTime?
  reviewNotes      String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@unique([tenantId, supplierId, invoiceNumber])
  @@index([tenantId, status, submittedAt])
  @@index([supplierId, status])
  @@index([purchaseOrderRef])
}

model SupplierCollaborationShipment {
  id                    String   @id @default(cuid())
  tenantId              String
  supplierId            String
  purchaseOrderRef      String?
  shipmentReference     String
  trackingNumber        String?
  carrierName           String?
  status                String   @default("PLANNED")
  origin                String?
  destination           String?
  estimatedDeliveryAt   DateTime?
  actualDeliveryAt      DateTime?
  supplierEmail         String?
  notes                 String?
  proofOfDeliveryRef    String?
  submittedAt           DateTime @default(now())
  lastStatusUpdatedAt   DateTime @default(now())
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([tenantId, supplierId, shipmentReference])
  @@index([tenantId, status, estimatedDeliveryAt])
  @@index([supplierId, status])
  @@index([purchaseOrderRef])
  @@index([trackingNumber])
}

model SupplierConversationThread {
  id               String   @id @default(cuid())
  tenantId         String
  supplierId       String
  subject          String
  contextType      String?
  contextReference String?
  status           String   @default("OPEN")
  priority         String   @default("NORMAL")
  buyerOwnerUserId String?
  supplierEmail    String?
  lastMessageAt    DateTime @default(now())
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  messages SupplierConversationMessage[]

  @@index([tenantId, status, lastMessageAt])
  @@index([supplierId, status])
  @@index([contextType, contextReference])
}

model SupplierConversationMessage {
  id          String   @id @default(cuid())
  tenantId    String
  threadId    String
  senderType  String
  senderId    String?
  senderEmail String?
  body        String
  attachmentRef String?
  readByBuyerAt DateTime?
  readBySupplierAt DateTime?
  createdAt   DateTime @default(now())

  thread SupplierConversationThread @relation(fields: [threadId], references: [id], onDelete: Cascade)

  @@index([tenantId, createdAt])
  @@index([threadId, createdAt])
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added Supplier Collaboration Operations schema.");
