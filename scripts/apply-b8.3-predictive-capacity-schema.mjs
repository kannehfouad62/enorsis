#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model PredictiveCapacityPlanningRun")) {
  console.log("B8.3 predictive capacity schema already present.");
  process.exit(0);
}

schema += `

model PredictiveCapacityPlanningRun {
  id                String   @id @default(cuid())
  tenantId          String
  createdByUserId   String
  horizonDays       Int      @default(90)
  targetHeadroomPct Decimal  @default(20) @db.Decimal(6, 2)
  modelVersion      String   @default("ENORSIS_CAPACITY_V1")
  status            String   @default("COMPLETED")
  assumptions       Json?
  generatedAt       DateTime @default(now())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([tenantId, generatedAt])
  @@index([tenantId, status])
}

model PredictiveCapacityPlanningSignal {
  id                    String   @id @default(cuid())
  tenantId              String
  capacityRunId         String
  scopeType             String
  scopeKey              String
  scopeLabel            String
  currentUnits          Decimal  @db.Decimal(20, 4)
  projectedDemandUnits  Decimal  @db.Decimal(20, 4)
  projectedInboundUnits Decimal  @db.Decimal(20, 4)
  projectedEndingUnits  Decimal  @db.Decimal(20, 4)
  operatingCapacityProxy Decimal @db.Decimal(20, 4)
  currentUtilizationPct Decimal  @db.Decimal(8, 2)
  projectedUtilizationPct Decimal @db.Decimal(8, 2)
  capacityGapUnits      Decimal  @db.Decimal(20, 4)
  pressureScore         Decimal  @db.Decimal(8, 2)
  riskLevel             String   @default("LOW")
  recommendation        String
  confidence            Decimal  @db.Decimal(6, 2)
  evidence              Json
  createdAt             DateTime @default(now())

  @@index([tenantId, capacityRunId, riskLevel])
  @@index([tenantId, scopeType, scopeKey])
  @@index([projectedUtilizationPct])
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B8.3 predictive capacity planning schema.");
