#!/usr/bin/env node
import fs from "node:fs";

const path = "prisma/schema.prisma";
let source = fs.readFileSync(path, "utf8");

if (
  source.includes("model MarketplacePurchaseRequestLineBinding") &&
  source.includes("model MarketplaceSellerOrder")
) {
  console.log("B13.10.5 marketplace commerce models already exist.");
  process.exit(0);
}

const models = `
model MarketplacePurchaseRequestLineBinding {
  id                    String   @id @default(cuid())
  tenantId              String
  purchaseRequestId     String
  purchaseRequestLineId String   @unique
  marketplaceOfferingId String
  sellerTenantId        String
  sellerSupplierId      String
  offeringName          String
  sku                   String?
  imageRef              String?
  currencyCode          String   @default("USD")
  unitPrice             Decimal  @db.Decimal(18, 4)
  quantity              Decimal  @db.Decimal(18, 4)
  unitOfMeasure         String
  leadTimeDays          Int?
  createdAt             DateTime @default(now())

  @@index([tenantId, purchaseRequestId])
  @@index([sellerTenantId, createdAt])
}

model MarketplaceSellerOrder {
  id                       String   @id @default(cuid())
  buyerTenantId            String
  sellerTenantId           String
  purchaseRequestId        String
  buyerSupplierId          String?
  sellerSupplierId         String
  journeyId                String?
  purchaseOrderExecutionId String?
  orderNumber              String?
  status                   String   @default("PENDING")
  currencyCode             String
  totalAmount              Decimal  @db.Decimal(18, 4)
  lineSnapshot             Json
  buyerRequesterUserId     String?
  buyerTenantName          String?
  acceptedByUserId         String?
  acceptedAt               DateTime?
  rejectedByUserId         String?
  rejectedAt               DateTime?
  rejectionReason          String?
  carrier                  String?
  trackingNumber           String?
  expectedDeliveryAt       DateTime?
  shippedByUserId          String?
  shippedAt                DateTime?
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  @@unique([purchaseRequestId, sellerTenantId])
  @@index([sellerTenantId, status, createdAt])
  @@index([buyerTenantId, status, createdAt])
}
`;

const anchor = "model SupplierMarketplaceOfferingMedia";
const index = source.indexOf(anchor);

source = index === -1
  ? source + "\n" + models + "\n"
  : source.slice(0, index) + models + "\n" + source.slice(index);

fs.writeFileSync(path, source);
console.log("Added MarketplacePurchaseRequestLineBinding.");
console.log("Added MarketplaceSellerOrder.");
console.log("B13.10.5 marketplace commerce schema complete.");
