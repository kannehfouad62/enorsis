#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model ClosedLoopProcurementOutcome")) {
  console.log("B12.1 closed-loop outcome schema already present.");
  process.exit(0);
}

schema += `

model ClosedLoopProcurementOutcome {
  id                   String   @id @default(cuid())
  tenantId             String
  orchestrationRunId   String
  executionHandoffId   String
  targetWorkflow       String
  nativeReferenceType  String?
  nativeReferenceId    String?
  nativeReferenceUrl   String?
  status               String   @default("OPEN")
  sourceConfidence     Float?
  outcomeQuality       String   @default("UNVERIFIED")
  openedAt             DateTime @default(now())
  observedAt           DateTime?
  validatedAt          DateTime?
  validatedByUserId    String?
  validationNote       String?
  sourceSnapshot       Json
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@unique([tenantId, orchestrationRunId], map: "ClosedOutcome_run_key")
  @@index([tenantId, status], map: "ClosedOutcome_status_idx")
  @@index([tenantId, targetWorkflow], map: "ClosedOutcome_workflow_idx")
}

model ClosedLoopProcurementOutcomeMetric {
  id                   String   @id @default(cuid())
  tenantId             String
  outcomeId            String
  metricKey            String
  metricLabel          String
  unit                 String?
  predictedValue       Float?
  actualValue          Float?
  varianceValue        Float?
  variancePercent      Float?
  confidence           Float?
  status               String   @default("PREDICTED")
  evidence             Json?
  observedByUserId     String?
  observedAt           DateTime?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@unique([tenantId, outcomeId, metricKey], map: "ClosedMetric_outcome_key")
  @@index([tenantId, metricKey, status], map: "ClosedMetric_metric_idx")
  @@index([tenantId, outcomeId], map: "ClosedMetric_outcome_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B12.1 closed-loop procurement outcome schema.");
