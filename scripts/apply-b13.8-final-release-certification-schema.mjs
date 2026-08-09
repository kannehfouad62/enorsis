#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model FinalEnterpriseReleaseCertificationRun")) {
  console.log("B13.8 final enterprise release certification schema already present.");
  process.exit(0);
}

schema += `

model FinalEnterpriseReleaseCertificationRun {
  id                   String   @id @default(cuid())
  tenantId             String
  releaseKey           String
  status               String   @default("RUNNING")
  triggeredByUserId    String?
  readinessScore       Float    @default(0)
  totalGates           Int      @default(0)
  passedGates          Int      @default(0)
  warningGates         Int      @default(0)
  failedGates          Int      @default(0)
  decision             String   @default("HOLD")
  summary              Json?
  startedAt            DateTime @default(now())
  completedAt          DateTime?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@index([tenantId, createdAt], map: "FinalReleaseCert_created_idx")
  @@index([tenantId, status], map: "FinalReleaseCert_status_idx")
}

model FinalEnterpriseReleaseCertificationGate {
  id                    String   @id @default(cuid())
  tenantId              String
  certificationRunId    String
  gateKey               String
  gateLabel             String
  category              String
  status                String
  severity              String   @default("HIGH")
  message               String
  evidence              Json
  createdAt             DateTime @default(now())

  @@unique([certificationRunId, gateKey], map: "FinalReleaseGate_run_key")
  @@index([tenantId, certificationRunId], map: "FinalReleaseGate_run_idx")
  @@index([tenantId, status, category], map: "FinalReleaseGate_status_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B13.8 final enterprise release certification schema.");
