#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model SecurityGovernanceCertificationRun")) {
  console.log("B13.7 security governance certification schema already present.");
  process.exit(0);
}

schema += `

model SecurityGovernanceCertificationRun {
  id                 String   @id @default(cuid())
  tenantId           String
  status             String   @default("RUNNING")
  triggeredByUserId  String?
  totalScenarios     Int      @default(0)
  passedScenarios    Int      @default(0)
  warningScenarios   Int      @default(0)
  failedScenarios    Int      @default(0)
  certificationScore Float    @default(0)
  summary            Json?
  startedAt          DateTime @default(now())
  completedAt        DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([tenantId, createdAt], map: "SecGovCertRun_created_idx")
  @@index([tenantId, status], map: "SecGovCertRun_status_idx")
}

model SecurityGovernanceCertificationResult {
  id                    String   @id @default(cuid())
  tenantId              String
  certificationRunId    String
  scenarioKey           String
  scenarioLabel         String
  category              String
  status                String
  severity              String   @default("MEDIUM")
  message               String
  evidence              Json
  createdAt             DateTime @default(now())

  @@unique([certificationRunId, scenarioKey], map: "SecGovCertResult_run_key")
  @@index([tenantId, certificationRunId], map: "SecGovCertResult_run_idx")
  @@index([tenantId, status, category], map: "SecGovCertResult_status_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B13.7 security and governance certification schema.");
