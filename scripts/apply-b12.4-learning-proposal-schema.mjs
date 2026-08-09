#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model ClosedLoopLearningProposal")) {
  console.log("B12.4 governed learning proposal schema already present.");
  process.exit(0);
}

schema += `

model ClosedLoopLearningProposal {
  id                 String   @id @default(cuid())
  tenantId           String
  proposalType       String
  scopeKey           String
  scopeLabel         String
  status             String   @default("DRAFT")
  priority           String   @default("MEDIUM")
  title              String
  rationale          String
  currentValue       Float?
  proposedValue      Float?
  confidence         Float?
  evidenceCount      Int      @default(0)
  evidenceSnapshot   Json
  createdBySystem    Boolean  @default(true)
  reviewedByUserId   String?
  reviewedAt         DateTime?
  decisionNote       String?
  approvedAt         DateTime?
  rejectedAt         DateTime?
  supersededAt       DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([tenantId, proposalType, scopeKey, status], map: "LearnProposal_scope_status_key")
  @@index([tenantId, status, priority], map: "LearnProposal_status_idx")
  @@index([tenantId, proposalType], map: "LearnProposal_type_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B12.4 governed learning proposal schema.");
