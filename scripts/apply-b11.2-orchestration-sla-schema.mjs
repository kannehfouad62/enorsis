#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model AutonomousProcurementOrchestrationEscalation")) {
  console.log("B11.2 orchestration SLA/escalation schema already present.");
  process.exit(0);
}

schema += `

model AutonomousProcurementOrchestrationEscalation {
  id                 String   @id @default(cuid())
  tenantId           String
  orchestrationRunId String
  escalationType     String
  severity           String
  status             String   @default("OPEN")
  stage              String
  runStatus          String
  ageMinutes         Int
  thresholdMinutes   Int
  summary            String
  details            Json
  firstDetectedAt    DateTime @default(now())
  lastDetectedAt     DateTime @default(now())
  occurrenceCount    Int      @default(1)
  acknowledgedByUserId String?
  acknowledgedAt     DateTime?
  resolvedByUserId   String?
  resolvedAt         DateTime?
  resolutionNote     String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([tenantId, orchestrationRunId, escalationType], map: "AutoOrchEsc_run_type_key")
  @@index([tenantId, status, severity], map: "AutoOrchEsc_status_sev_idx")
  @@index([tenantId, orchestrationRunId], map: "AutoOrchEsc_run_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B11.2 orchestration SLA and escalation schema.");
