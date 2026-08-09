#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model AutonomousProcurementOrchestrationRun")) {
  console.log("B11.1 governed orchestration schema already present.");
  process.exit(0);
}

schema += `

model AutonomousProcurementOrchestrationRun {
  id                 String   @id @default(cuid())
  tenantId           String
  executionHandoffId String
  executionEnvelopeId String
  targetWorkflow     String
  status             String   @default("DISCOVERED")
  stage              String   @default("RELEASED_HANDOFF")
  pauseReason        String?
  adapterJobId       String?
  nativeDraftId      String?
  nativeReferenceType String?
  nativeReferenceId  String?
  nativeReferenceUrl String?
  attemptCount       Int      @default(0)
  lastAttemptAt      DateTime?
  nextAttemptAt      DateTime?
  lastError          String?
  startedAt          DateTime @default(now())
  completedAt        DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([tenantId, executionHandoffId], map: "AutoOrch_handoff_key")
  @@index([tenantId, status, nextAttemptAt], map: "AutoOrch_status_retry_idx")
  @@index([tenantId, stage], map: "AutoOrch_stage_idx")
}

model AutonomousProcurementOrchestrationEvent {
  id               String   @id @default(cuid())
  tenantId         String
  orchestrationRunId String
  eventType        String
  fromStage        String?
  toStage          String?
  actorUserId      String?
  message          String?
  evidence         Json?
  createdAt        DateTime @default(now())

  @@index([tenantId, orchestrationRunId, createdAt], map: "AutoOrchEvent_run_idx")
  @@index([tenantId, eventType], map: "AutoOrchEvent_type_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B11.1 governed autonomous orchestration schema.");
