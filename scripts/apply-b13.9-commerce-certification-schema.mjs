#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model EndToEndCommerceCertificationRun")) {
  console.log("B13.9 end-to-end commerce certification schema already present.");
  process.exit(0);
}

schema += `

model EndToEndCommerceCertificationRun {
  id                 String   @id @default(cuid())
  tenantId           String
  status             String   @default("RUNNING")
  triggeredByUserId  String?
  certificationScore Float    @default(0)
  totalChecks        Int      @default(0)
  passedChecks       Int      @default(0)
  warningChecks      Int      @default(0)
  failedChecks       Int      @default(0)
  summary            Json?
  startedAt          DateTime @default(now())
  completedAt        DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([tenantId, createdAt], map: "E2ECommerceCert_created_idx")
  @@index([tenantId, status], map: "E2ECommerceCert_status_idx")
}

model EndToEndCommerceCertificationCheck {
  id                 String   @id @default(cuid())
  tenantId           String
  certificationRunId String
  checkKey           String
  checkLabel         String
  lifecycleStage     String
  status             String
  severity           String   @default("HIGH")
  message            String
  evidence           Json
  createdAt          DateTime @default(now())

  @@unique([certificationRunId, checkKey], map: "E2ECommerceCheck_run_key")
  @@index([tenantId, certificationRunId], map: "E2ECommerceCheck_run_idx")
  @@index([tenantId, status, lifecycleStage], map: "E2ECommerceCheck_status_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B13.9 end-to-end commerce certification schema.");
