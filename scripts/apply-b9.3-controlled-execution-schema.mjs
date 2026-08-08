#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model AutonomousExecutionEnvelope")) {
  console.log("B9.3 controlled execution schema already present.");
  process.exit(0);
}

schema += `

model AutonomousExecutionEnvelope {
  id                    String   @id @default(cuid())
  tenantId              String
  createdByUserId       String
  sourceType            String
  sourceId              String
  sourceLabel           String
  executionType         String
  targetWorkflow        String
  status                String   @default("PENDING_POLICY_REVIEW")
  riskLevel             String   @default("LOW")
  proposedValueUsd      Decimal? @db.Decimal(20, 4)
  proposedQuantity      Decimal? @db.Decimal(20, 4)
  proposedSupplierId    String?
  executionPayload      Json
  policySnapshot        Json
  readinessSummary      Json
  requiresHumanRelease  Boolean  @default(true)
  releasedByUserId      String?
  releasedAt            DateTime?
  rejectedByUserId      String?
  rejectedAt            DateTime?
  rejectionReason       String?
  handoffStatus         String   @default("NOT_RELEASED")
  handoffReference      String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([tenantId, sourceType, sourceId], map: "AutoExec_source_key")
  @@index([tenantId, status], map: "AutoExec_tenant_status_idx")
  @@index([tenantId, createdAt], map: "AutoExec_tenant_created_idx")
  @@index([tenantId, executionType], map: "AutoExec_type_idx")
}

model AutonomousExecutionPolicyCheck {
  id                  String   @id @default(cuid())
  tenantId            String
  executionEnvelopeId String
  policyKey           String
  policyLabel         String
  result              String
  severity            String   @default("LOW")
  blocking            Boolean  @default(false)
  rationale           String
  evidence            Json
  evaluatedAt         DateTime @default(now())
  createdAt           DateTime @default(now())

  @@unique([executionEnvelopeId, policyKey], map: "AutoExecPolicy_env_key")
  @@index([tenantId, executionEnvelopeId], map: "AutoExecPolicy_env_idx")
  @@index([tenantId, result], map: "AutoExecPolicy_result_idx")
}

model AutonomousExecutionDecision {
  id                  String   @id @default(cuid())
  tenantId            String
  executionEnvelopeId String
  decision            String
  decidedByUserId     String
  reason              String?
  evidence            Json?
  createdAt           DateTime @default(now())

  @@index([tenantId, executionEnvelopeId, createdAt], map: "AutoExecDecision_env_idx")
  @@index([tenantId, decision], map: "AutoExecDecision_type_idx")
}

model AutonomousExecutionHandoff {
  id                  String   @id @default(cuid())
  tenantId            String
  executionEnvelopeId String
  targetWorkflow      String
  handoffMode         String   @default("CONTROLLED")
  status              String   @default("READY_FOR_HANDOFF")
  payload             Json
  createdByUserId     String
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([tenantId, status], map: "AutoExecHandoff_status_idx")
  @@index([tenantId, executionEnvelopeId], map: "AutoExecHandoff_env_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B9.3 controlled execution and policy governance schema.");
