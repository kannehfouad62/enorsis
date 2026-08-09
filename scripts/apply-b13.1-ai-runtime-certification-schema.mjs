#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model AiRuntimeCertificationRun")) {
  console.log("B13.1 AI runtime certification schema already present.");
  process.exit(0);
}

schema += `

model AiRuntimeCertificationRun {
  id                 String   @id @default(cuid())
  tenantId           String
  certificationKey   String
  status             String   @default("RUNNING")
  startedAt          DateTime @default(now())
  completedAt        DateTime?
  triggeredByUserId  String?
  totalScenarios     Int      @default(0)
  passedScenarios    Int      @default(0)
  warningScenarios   Int      @default(0)
  failedScenarios    Int      @default(0)
  certificationScore Float    @default(0)
  summary            Json?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([tenantId, createdAt], map: "AiCertRun_created_idx")
  @@index([tenantId, status], map: "AiCertRun_status_idx")
}

model AiRuntimeCertificationResult {
  id              String   @id @default(cuid())
  tenantId        String
  certificationRunId String
  scenarioKey     String
  scenarioLabel   String
  category        String
  status          String
  severity        String   @default("MEDIUM")
  message         String
  evidence        Json
  durationMs      Int      @default(0)
  createdAt       DateTime @default(now())

  @@unique([certificationRunId, scenarioKey], map: "AiCertResult_run_scenario_key")
  @@index([tenantId, certificationRunId], map: "AiCertResult_run_idx")
  @@index([tenantId, status, category], map: "AiCertResult_status_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B13.1 governed AI runtime certification schema.");
