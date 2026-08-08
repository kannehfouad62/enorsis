#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model SupplierMarketplaceVerification")) {
  console.log("B7.3 marketplace trust schema already present.");
  process.exit(0);
}

schema += `

model SupplierMarketplaceVerification {
  id                String   @id @default(cuid())
  tenantId          String
  supplierId        String
  marketplaceProfileId String?
  status            String   @default("PENDING")
  verificationType  String   @default("STANDARD")
  evidenceSummary   String?
  evidenceRefs      Json?
  reviewerNotes     String?
  requestedByUserId String?
  requestedAt       DateTime @default(now())
  reviewedByUserId  String?
  reviewedAt        DateTime?
  expiresAt         DateTime?
  suspendedAt       DateTime?
  suspensionReason  String?
  reinstatedAt      DateTime?
  reinstatedByUserId String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([tenantId, supplierId, status])
  @@index([tenantId, status, requestedAt])
  @@index([marketplaceProfileId])
  @@index([expiresAt])
}

model SupplierMarketplaceRating {
  id                String   @id @default(cuid())
  tenantId          String
  supplierId        String
  marketplaceProfileId String?
  ratingType        String   @default("BUYER_REVIEW")
  overallRating     Decimal  @db.Decimal(3, 2)
  qualityRating     Decimal? @db.Decimal(3, 2)
  deliveryRating    Decimal? @db.Decimal(3, 2)
  serviceRating     Decimal? @db.Decimal(3, 2)
  valueRating       Decimal? @db.Decimal(3, 2)
  complianceRating  Decimal? @db.Decimal(3, 2)
  reviewTitle       String?
  reviewText        String?
  contextType       String?
  contextReference  String?
  reviewerUserId    String?
  reviewerLabel     String?
  status            String   @default("PUBLISHED")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([tenantId, supplierId, status])
  @@index([tenantId, createdAt])
  @@index([marketplaceProfileId])
  @@index([contextType, contextReference])
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B7.3 verification and marketplace rating schema.");
