#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model ClosedLoopRuntimePromotionAssessment")) {
  console.log("B12.9 runtime promotion schema already present.");
  process.exit(0);
}

schema += `

model ClosedLoopRuntimePromotionAssessment {
  id                     String   @id @default(cuid())
  tenantId               String
  adoptionId             String
  decisionPath           String
  status                 String   @default("DRAFT")
  currentMode            String
  recommendedMode        String
  readinessScore         Float
  minimumDecisionCount   Int
  observedDecisionCount  Int
  maximumDivergenceRate  Float
  observedDivergenceRate Float
  fallbackRate           Float
  clampedDecisionCount   Int
  deniedDecisionCount    Int
  eligible               Boolean  @default(false)
  blockers               Json
  evidenceSnapshot       Json
  generatedAt            DateTime @default(now())
  reviewedByUserId       String?
  reviewedAt             DateTime?
  decisionNote           String?
  promotedAt             DateTime?
  rejectedAt             DateTime?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  @@index([tenantId, adoptionId, createdAt], map: "RuntimePromote_adopt_idx")
  @@index([tenantId, status, eligible], map: "RuntimePromote_status_idx")
}

model ClosedLoopRuntimeRollbackRule {
  id                     String   @id @default(cuid())
  tenantId               String
  adoptionId             String
  decisionPath           String
  status                 String   @default("ACTIVE")
  maximumDivergenceRate  Float    @default(20)
  maximumFallbackRate    Float    @default(25)
  maximumDeniedRate      Float    @default(50)
  minimumDecisionCount   Int      @default(20)
  autoRollbackEnabled    Boolean  @default(false)
  createdByUserId        String?
  updatedByUserId        String?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  @@unique([tenantId, adoptionId], map: "RuntimeRollback_adopt_key")
  @@index([tenantId, status], map: "RuntimeRollback_status_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B12.9 governed runtime promotion and rollback schema.");
