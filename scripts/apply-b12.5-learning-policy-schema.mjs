#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model ClosedLoopLearningPolicy")) {
  console.log("B12.5 governed learning policy schema already present.");
  process.exit(0);
}

schema += `

model ClosedLoopLearningPolicy {
  id                 String   @id @default(cuid())
  tenantId           String
  proposalId         String
  policyKey          String
  policyType         String
  scopeKey           String
  scopeLabel         String
  version            Int
  status             String   @default("CANDIDATE")
  currentValue       Float?
  proposedValue      Float?
  effectiveValue     Float?
  configuration      Json
  rationale          String
  activatedByUserId  String?
  activatedAt        DateTime?
  deactivatedByUserId String?
  deactivatedAt      DateTime?
  supersedesPolicyId String?
  rollbackOfPolicyId String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([tenantId, policyKey, version], map: "LearnPolicy_key_ver_key")
  @@index([tenantId, policyKey, status], map: "LearnPolicy_key_status_idx")
  @@index([tenantId, proposalId], map: "LearnPolicy_proposal_idx")
}

model ClosedLoopLearningPolicyEvent {
  id                 String   @id @default(cuid())
  tenantId           String
  policyId           String
  eventType          String
  actorUserId        String?
  fromStatus         String?
  toStatus           String?
  message            String?
  snapshot           Json
  createdAt          DateTime @default(now())

  @@index([tenantId, policyId, createdAt], map: "LearnPolicyEvent_policy_idx")
  @@index([tenantId, eventType], map: "LearnPolicyEvent_type_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B12.5 governed learning policy schema.");
