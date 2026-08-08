#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model AutonomousExecutionAdapterJob")) {
  console.log("B9.4 controlled transaction adapter schema already present.");
  process.exit(0);
}

schema += `

model AutonomousExecutionAdapterJob {
  id                  String   @id @default(cuid())
  tenantId            String
  executionHandoffId  String
  executionEnvelopeId String
  targetWorkflow      String
  adapterKey          String
  nativeRoute         String
  status              String   @default("DRAFT_READY")
  idempotencyKey      String
  draftPayload        Json
  validationSnapshot  Json
  nativeReferenceType String?
  nativeReferenceId   String?
  nativeReferenceUrl  String?
  activatedByUserId   String?
  activatedAt         DateTime?
  completedByUserId   String?
  completedAt         DateTime?
  failureReason       String?
  createdByUserId     String
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([tenantId, idempotencyKey], map: "AutoAdapter_idempotency_key")
  @@unique([tenantId, executionHandoffId], map: "AutoAdapter_handoff_key")
  @@index([tenantId, status], map: "AutoAdapter_status_idx")
  @@index([tenantId, targetWorkflow], map: "AutoAdapter_workflow_idx")
}

model AutonomousExecutionAdapterDecision {
  id           String   @id @default(cuid())
  tenantId     String
  adapterJobId String
  decision     String
  decidedByUserId String
  reason       String?
  evidence     Json?
  createdAt    DateTime @default(now())

  @@index([tenantId, adapterJobId, createdAt], map: "AutoAdapterDecision_job_idx")
  @@index([tenantId, decision], map: "AutoAdapterDecision_type_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B9.4 controlled transaction adapter queue schema.");
