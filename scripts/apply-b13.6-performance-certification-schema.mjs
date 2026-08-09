#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model EnterprisePerformanceCertificationRun")) {
  console.log("B13.6 enterprise performance certification schema already present.");
  process.exit(0);
}

schema += `

model EnterprisePerformanceCertificationRun {
  id                    String   @id @default(cuid())
  tenantId              String
  status                String   @default("RUNNING")
  triggeredByUserId     String?
  certificationScore    Float    @default(0)
  totalScenarios        Int      @default(0)
  passedScenarios       Int      @default(0)
  warningScenarios      Int      @default(0)
  failedScenarios       Int      @default(0)
  averageLatencyMs      Float    @default(0)
  p95LatencyMs          Float    @default(0)
  summary               Json?
  startedAt             DateTime @default(now())
  completedAt           DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([tenantId, createdAt], map: "PerfCertRun_created_idx")
  @@index([tenantId, status], map: "PerfCertRun_status_idx")
}

model EnterprisePerformanceCertificationResult {
  id                    String   @id @default(cuid())
  tenantId              String
  certificationRunId    String
  scenarioKey           String
  scenarioLabel         String
  category              String
  status                String
  severity              String   @default("MEDIUM")
  latencyMs             Float
  thresholdMs           Float
  message               String
  evidence              Json
  createdAt             DateTime @default(now())

  @@unique([certificationRunId, scenarioKey], map: "PerfCertResult_run_key")
  @@index([tenantId, certificationRunId], map: "PerfCertResult_run_idx")
  @@index([tenantId, status, category], map: "PerfCertResult_status_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B13.6 enterprise scale and performance certification schema.");
