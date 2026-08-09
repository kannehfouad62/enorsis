#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model AutonomousProcurementOrchestrationSignal")) {
  console.log("B11.3 orchestration signal schema already present.");
  process.exit(0);
}

schema += `

model AutonomousProcurementOrchestrationSignal {
  id                 String   @id @default(cuid())
  tenantId           String
  orchestrationRunId String
  signalType         String
  idempotencyKey     String
  status             String   @default("RECEIVED")
  actorUserId        String?
  source             String   @default("INTERNAL")
  payload            Json?
  receivedAt         DateTime @default(now())
  processedAt        DateTime?
  processingResult   String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([tenantId, idempotencyKey], map: "AutoOrchSignal_idem_key")
  @@index([tenantId, orchestrationRunId, receivedAt], map: "AutoOrchSignal_run_idx")
  @@index([tenantId, status, receivedAt], map: "AutoOrchSignal_status_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B11.3 event-driven orchestration signal schema.");
