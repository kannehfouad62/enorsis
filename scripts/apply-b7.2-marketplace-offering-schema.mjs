#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model SupplierMarketplaceOffering")) {
  console.log("B7.2 marketplace offering schema already present.");
  process.exit(0);
}

schema += `

model SupplierMarketplaceOffering {
  id                 String   @id @default(cuid())
  tenantId           String
  supplierId         String
  marketplaceProfileId String?
  offeringType       String   @default("PRODUCT")
  sku                String?
  name               String
  shortDescription   String?
  description        String?
  category           String?
  subcategory        String?
  manufacturer       String?
  brand              String?
  modelNumber        String?
  unitOfMeasure      String?
  currencyCode       String   @default("USD")
  unitPrice          Decimal? @db.Decimal(18, 4)
  minimumOrderQty    Decimal? @db.Decimal(18, 4)
  leadTimeDays       Int?
  availabilityStatus String   @default("AVAILABLE")
  countriesAvailable Json?
  certifications     Json?
  attributes         Json?
  keywords           Json?
  imageRef           String?
  documentRef        String?
  externalUrl        String?
  marketplaceVisible Boolean  @default(false)
  featured           Boolean  @default(false)
  publishedAt        DateTime?
  createdByUserId    String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([tenantId, supplierId, sku])
  @@index([tenantId, marketplaceVisible, offeringType])
  @@index([tenantId, category, availabilityStatus])
  @@index([supplierId, marketplaceVisible])
  @@index([marketplaceProfileId])
  @@index([name])
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B7.2 Supplier Marketplace Offering schema.");
