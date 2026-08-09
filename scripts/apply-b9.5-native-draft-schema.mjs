#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model AutonomousNativeWorkflowDraft")) {
  console.log("B9.5 governed native workflow draft schema already present.");
  process.exit(0);
}

schema += `

model AutonomousNativeWorkflowDraft {
  id                   String   @id @default(cuid())
  tenantId             String
  adapterJobId         String
  executionHandoffId   String
  targetWorkflow       String
  nativeReferenceType  String
  nativeRoute          String
  status               String   @default("DRAFT_MATERIALIZED")
  draftTitle           String
  draftPayload         Json
  validationSnapshot   Json
  requiresNativeReview Boolean  @default(true)
  openedByUserId       String?
  openedAt             DateTime?
  nativeReferenceId    String?
  nativeReferenceUrl   String?
  completedByUserId    String?
  completedAt          DateTime?
  completionNote       String?
  createdByUserId      String
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  @@unique([tenantId, adapterJobId], map: "AutoNativeDraft_adapter_key")
  @@index([tenantId, status], map: "AutoNativeDraft_status_idx")
  @@index([tenantId, targetWorkflow], map: "AutoNativeDraft_workflow_idx")
}

model AutonomousNativeWorkflowDraftDecision {
  id              String   @id @default(cuid())
  tenantId        String
  nativeDraftId   String
  decision        String
  decidedByUserId String
  reason          String?
  evidence        Json?
  createdAt       DateTime @default(now())

  @@index([tenantId, nativeDraftId, createdAt], map: "AutoNativeDecision_draft_idx")
  @@index([tenantId, decision], map: "AutoNativeDecision_type_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B9.5 governed native workflow draft schema.");
