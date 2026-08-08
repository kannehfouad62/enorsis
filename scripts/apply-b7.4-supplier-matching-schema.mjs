#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model SupplierMarketplaceMatchRun")) {
  console.log("B7.4 supplier matching schema already present.");
  process.exit(0);
}

schema += `

model SupplierMarketplaceMatchRun {
  id                    String   @id @default(cuid())
  tenantId              String
  createdByUserId       String
  title                 String
  requirementText       String
  category              String?
  country               String?
  requiredCapabilities  Json?
  requiredCertifications Json?
  preferredCurrency     String?
  maxLeadTimeDays       Int?
  verificationRequired  Boolean  @default(false)
  weights               Json?
  status                String   @default("COMPLETED")
  candidateCount        Int      @default(0)
  aiExecutionId         String?
  aiSummary             String?
  aiError               String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([tenantId, createdAt])
  @@index([tenantId, status])
}

model SupplierMarketplaceMatchResult {
  id                String   @id @default(cuid())
  tenantId          String
  matchRunId        String
  supplierId        String
  rank              Int
  totalScore        Decimal  @db.Decimal(6, 2)
  capabilityScore   Decimal  @db.Decimal(6, 2)
  geographyScore    Decimal  @db.Decimal(6, 2)
  trustScore        Decimal  @db.Decimal(6, 2)
  performanceScore  Decimal  @db.Decimal(6, 2)
  riskScore         Decimal  @db.Decimal(6, 2)
  catalogScore      Decimal  @db.Decimal(6, 2)
  evidence          Json
  createdAt         DateTime @default(now())

  @@unique([matchRunId, supplierId])
  @@index([tenantId, matchRunId, rank])
  @@index([tenantId, supplierId])
  @@index([totalScore])
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B7.4 governed supplier matching schema.");
