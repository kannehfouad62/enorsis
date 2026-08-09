#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model ClosedLoopRuntimePolicyDecisionTrace")) {
  console.log("B12.7 runtime policy decision trace schema already present.");
  process.exit(0);
}

schema += `

model ClosedLoopRuntimePolicyDecisionTrace {
  id                 String   @id @default(cuid())
  tenantId           String
  decisionType       String
  scopeKey           String
  policyType         String
  policyKey          String
  policyId           String?
  proposalId         String?
  policyVersion      Int?
  policySource       String
  requestedDefault   Float
  effectiveValue     Float
  boundedValue       Float
  wasClamped         Boolean  @default(false)
  inputValue         Float?
  decisionResult     Boolean?
  rationale          String?
  evidence           Json
  actorUserId        String?
  correlationId      String?
  createdAt          DateTime @default(now())

  @@index([tenantId, createdAt], map: "RuntimeTrace_created_idx")
  @@index([tenantId, decisionType, createdAt], map: "RuntimeTrace_type_idx")
  @@index([tenantId, policyKey, createdAt], map: "RuntimeTrace_policy_idx")
  @@index([tenantId, policySource], map: "RuntimeTrace_source_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B12.7 runtime policy decision trace schema.");
