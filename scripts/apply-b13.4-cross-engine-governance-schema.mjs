#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model CrossEngineGovernanceAssessment")) {
  console.log("B13.4 cross-engine governance schema already present.");
  process.exit(0);
}

schema += `

model CrossEngineGovernanceAssessment {
  id                 String   @id @default(cuid())
  tenantId           String
  status             String   @default("COMPLETED")
  createdByUserId    String?
  procurementRunId   String?
  inventoryRunId     String?
  capacityRunId      String?
  conflictCount      Int      @default(0)
  criticalCount      Int      @default(0)
  highCount          Int      @default(0)
  mediumCount        Int      @default(0)
  alignmentScore     Float    @default(100)
  summary            Json
  generatedAt        DateTime @default(now())
  createdAt          DateTime @default(now())

  @@index([tenantId, generatedAt], map: "CrossGovAssess_generated_idx")
  @@index([tenantId, status], map: "CrossGovAssess_status_idx")
}

model CrossEngineGovernanceConflict {
  id                 String   @id @default(cuid())
  tenantId           String
  assessmentId       String
  conflictType       String
  severity           String
  scopeKey           String
  scopeLabel         String
  status             String   @default("OPEN")
  title              String
  rationale          String
  precedenceRule     String
  recommendedAction  String
  evidence           Json
  acknowledgedByUserId String?
  acknowledgedAt     DateTime?
  resolvedByUserId   String?
  resolvedAt         DateTime?
  resolutionNote     String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([tenantId, assessmentId], map: "CrossGovConflict_assess_idx")
  @@index([tenantId, status, severity], map: "CrossGovConflict_status_idx")
  @@index([tenantId, conflictType], map: "CrossGovConflict_type_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B13.4 cross-engine intelligence governance schema.");
