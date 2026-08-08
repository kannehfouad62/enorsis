#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model SupplierMarketplaceProfile")) {
  console.log("B7.1 marketplace schema already present.");
  process.exit(0);
}

schema += `

model SupplierMarketplaceProfile {
  id                  String   @id @default(cuid())
  tenantId            String
  supplierId          String
  marketplaceVisible  Boolean  @default(false)
  verificationStatus  String   @default("UNVERIFIED")
  headline            String?
  description         String?
  websiteUrl          String?
  headquartersCountry String?
  countriesServed     Json?
  industries          Json?
  categories          Json?
  capabilities        Json?
  certifications      Json?
  keywords            Json?
  minimumOrderValue   Decimal? @db.Decimal(18, 2)
  preferredCurrency   String?  @default("USD")
  leadTimeDays        Int?
  employeeBand        String?
  annualRevenueBand   String?
  sustainabilityTags  Json?
  diversityTags       Json?
  qualityScore        Decimal? @db.Decimal(5, 2)
  riskScore           Decimal? @db.Decimal(5, 2)
  performanceScore    Decimal? @db.Decimal(5, 2)
  marketplaceScore    Decimal? @db.Decimal(5, 2)
  verifiedAt          DateTime?
  verifiedByUserId    String?
  publishedAt         DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([tenantId, supplierId])
  @@index([tenantId, marketplaceVisible, verificationStatus])
  @@index([tenantId, marketplaceScore])
  @@index([headquartersCountry])
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B7.1 Supplier Marketplace Profile schema.");
