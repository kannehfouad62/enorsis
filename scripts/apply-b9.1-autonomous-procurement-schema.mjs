#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model AutonomousProcurementPlan")) {
  console.log("B9.1 autonomous procurement planning schema already present.");
  process.exit(0);
}

schema += `

model AutonomousProcurementPlan {
  id                    String   @id @default(cuid())
  tenantId              String
  createdByUserId       String
  title                 String
  horizonDays           Int      @default(90)
  status                String   @default("PENDING_APPROVAL")
  planVersion           Int      @default(1)
  modelVersion          String   @default("ENORSIS_AUTONOMOUS_PLAN_V1")
  sourceSnapshot        Json
  summary               Json
  aiExecutionId         String?
  aiNarrative           String?
  aiError               String?
  overallRiskLevel      String   @default("LOW")
  estimatedSpendUsd     Decimal  @default(0) @db.Decimal(20, 4)
  estimatedSavingsUsd   Decimal  @default(0) @db.Decimal(20, 4)
  requiresHumanApproval Boolean  @default(true)
  approvedByUserId      String?
  approvedAt            DateTime?
  rejectedByUserId      String?
  rejectedAt            DateTime?
  rejectionReason       String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([tenantId, createdAt], map: "AutoPlan_tenant_created_idx")
  @@index([tenantId, status], map: "AutoPlan_tenant_status_idx")
}

model AutonomousProcurementPlanAction {
  id                String   @id @default(cuid())
  tenantId          String
  planId            String
  sequence          Int
  actionType        String
  resourceType      String
  resourceId        String?
  resourceLabel     String
  priority          String   @default("MEDIUM")
  recommendation    String
  proposedQuantity  Decimal? @db.Decimal(20, 4)
  proposedValueUsd  Decimal? @db.Decimal(20, 4)
  proposedSupplierId String?
  confidence        Decimal  @default(50) @db.Decimal(6, 2)
  riskLevel         String   @default("LOW")
  evidence          Json
  status            String   @default("PROPOSED")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([planId, sequence], map: "AutoPlanAction_plan_seq_key")
  @@index([tenantId, planId, priority], map: "AutoPlanAction_plan_priority_idx")
  @@index([tenantId, actionType], map: "AutoPlanAction_type_idx")
}

model AutonomousProcurementPlanDecision {
  id              String   @id @default(cuid())
  tenantId        String
  planId          String
  decision        String
  decidedByUserId String
  decisionReason  String?
  evidence        Json?
  createdAt       DateTime @default(now())

  @@index([tenantId, planId, createdAt], map: "AutoPlanDecision_plan_idx")
  @@index([tenantId, decision], map: "AutoPlanDecision_type_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B9.1 human-governed autonomous procurement planning schema.");
