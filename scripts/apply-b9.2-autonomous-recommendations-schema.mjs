#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model AutonomousProcurementRecommendationSet")) {
  console.log("B9.2 autonomous recommendation schema already present.");
  process.exit(0);
}

schema += `

model AutonomousProcurementRecommendationSet {
  id                    String   @id @default(cuid())
  tenantId              String
  createdByUserId       String
  sourcePlanId          String?
  title                 String
  horizonDays           Int      @default(90)
  modelVersion          String   @default("ENORSIS_AUTONOMOUS_RECOMMEND_V1")
  status                String   @default("PENDING_REVIEW")
  overallRiskLevel      String   @default("LOW")
  estimatedSavingsUsd   Decimal  @default(0) @db.Decimal(20, 4)
  estimatedExposureUsd  Decimal  @default(0) @db.Decimal(20, 4)
  sourceSnapshot        Json
  summary               Json
  aiExecutionId         String?
  aiNarrative           String?
  aiError               String?
  reviewedByUserId      String?
  reviewedAt            DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([tenantId, createdAt], map: "AutoRecSet_tenant_created_idx")
  @@index([tenantId, status], map: "AutoRecSet_tenant_status_idx")
  @@index([tenantId, sourcePlanId], map: "AutoRecSet_source_plan_idx")
}

model AutonomousProcurementRecommendation {
  id                  String   @id @default(cuid())
  tenantId            String
  recommendationSetId String
  sequence            Int
  recommendationType  String
  title               String
  description         String
  priority            String   @default("MEDIUM")
  riskLevel           String   @default("LOW")
  estimatedSavingsUsd Decimal? @db.Decimal(20, 4)
  estimatedExposureUsd Decimal? @db.Decimal(20, 4)
  confidence          Decimal  @default(50) @db.Decimal(6, 2)
  resourceType        String?
  resourceId          String?
  resourceLabel       String?
  evidence            Json
  status              String   @default("PROPOSED")
  disposition         String?
  dispositionReason   String?
  dispositionedByUserId String?
  dispositionedAt     DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([recommendationSetId, sequence], map: "AutoRec_set_seq_key")
  @@index([tenantId, recommendationSetId, priority], map: "AutoRec_set_priority_idx")
  @@index([tenantId, recommendationType], map: "AutoRec_type_idx")
  @@index([tenantId, status], map: "AutoRec_status_idx")
}

model AutonomousProcurementRecommendationDecision {
  id                  String   @id @default(cuid())
  tenantId            String
  recommendationId    String
  decision            String
  decidedByUserId     String
  reason              String?
  evidence            Json?
  createdAt           DateTime @default(now())

  @@index([tenantId, recommendationId, createdAt], map: "AutoRecDecision_rec_idx")
  @@index([tenantId, decision], map: "AutoRecDecision_type_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B9.2 autonomous strategy, savings and risk recommendation schema.");
