#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model ProcurementDigitalTwinScenario")) {
  console.log("B8.4 digital twin schema already present.");
  process.exit(0);
}

schema += `

model ProcurementDigitalTwinScenario {
  id                    String   @id @default(cuid())
  tenantId              String
  createdByUserId       String
  name                  String
  description           String?
  scenarioType          String   @default("COMBINED")
  horizonDays           Int      @default(90)
  demandShockPct        Decimal  @default(0) @db.Decimal(8, 2)
  leadTimeShockPct      Decimal  @default(0) @db.Decimal(8, 2)
  costInflationPct      Decimal  @default(0) @db.Decimal(8, 2)
  supplierDisruptionPct Decimal  @default(0) @db.Decimal(8, 2)
  inboundReductionPct   Decimal  @default(0) @db.Decimal(8, 2)
  safetyStockChangePct  Decimal  @default(0) @db.Decimal(8, 2)
  assumptions           Json?
  status                String   @default("DRAFT")
  simulatedAt           DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([tenantId, createdAt])
  @@index([tenantId, status])
}

model ProcurementDigitalTwinRun {
  id                    String   @id @default(cuid())
  tenantId              String
  scenarioId            String
  createdByUserId       String
  modelVersion          String   @default("ENORSIS_DIGITAL_TWIN_V1")
  baselineSnapshot      Json
  scenarioSnapshot      Json
  summary               Json
  riskLevel             String   @default("LOW")
  recommendation        String
  status                String   @default("COMPLETED")
  generatedAt           DateTime @default(now())
  createdAt             DateTime @default(now())

  @@index([tenantId, scenarioId, generatedAt])
  @@index([tenantId, riskLevel])
}

model ProcurementDigitalTwinImpact {
  id                    String   @id @default(cuid())
  tenantId              String
  digitalTwinRunId      String
  impactType            String
  scopeKey              String
  scopeLabel            String
  baselineValue         Decimal? @db.Decimal(20, 4)
  scenarioValue         Decimal? @db.Decimal(20, 4)
  varianceValue         Decimal? @db.Decimal(20, 4)
  variancePct           Decimal? @db.Decimal(10, 4)
  severity              String   @default("LOW")
  explanation           String
  evidence              Json
  createdAt             DateTime @default(now())

  @@index([tenantId, digitalTwinRunId, impactType])
  @@index([tenantId, severity])
  @@index([scopeKey])
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B8.4 procurement digital twin schema.");
