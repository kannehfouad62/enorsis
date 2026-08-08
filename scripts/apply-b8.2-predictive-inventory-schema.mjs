#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model PredictiveInventoryOptimizationRun")) {
  console.log("B8.2 predictive inventory schema already present.");
  process.exit(0);
}

schema += `

model PredictiveInventoryOptimizationRun {
  id                String   @id @default(cuid())
  tenantId          String
  createdByUserId   String
  horizonDays       Int      @default(90)
  modelVersion      String   @default("ENORSIS_INVENTORY_OPT_V1")
  status            String   @default("COMPLETED")
  assumptions       Json?
  generatedAt       DateTime @default(now())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([tenantId, generatedAt])
  @@index([tenantId, status])
}

model PredictiveInventoryOptimizationSignal {
  id                     String   @id @default(cuid())
  tenantId               String
  optimizationRunId      String
  inventoryItemId        String
  sku                    String
  itemName               String
  category               String?
  currentOnHand          Decimal  @db.Decimal(20, 4)
  currentAvailable       Decimal  @db.Decimal(20, 4)
  currentReserved        Decimal  @db.Decimal(20, 4)
  dailyDemand            Decimal  @db.Decimal(20, 6)
  horizonDemand          Decimal  @db.Decimal(20, 4)
  currentReorderPoint    Decimal  @db.Decimal(20, 4)
  predictedReorderPoint  Decimal  @db.Decimal(20, 4)
  currentSafetyStock     Decimal  @db.Decimal(20, 4)
  recommendedSafetyStock Decimal  @db.Decimal(20, 4)
  suggestedReorderQty    Decimal  @db.Decimal(20, 4)
  stockoutProbability    Decimal  @db.Decimal(6, 2)
  daysOfSupply           Decimal? @db.Decimal(12, 2)
  excessQuantity         Decimal  @db.Decimal(20, 4)
  excessValue            Decimal  @db.Decimal(20, 4)
  unitCost               Decimal  @db.Decimal(20, 4)
  leadTimeDays           Int
  riskLevel              String   @default("LOW")
  recommendation         String
  confidence             Decimal  @db.Decimal(6, 2)
  evidence               Json
  createdAt              DateTime @default(now())

  @@index([tenantId, optimizationRunId, riskLevel])
  @@index([tenantId, inventoryItemId])
  @@index([stockoutProbability])
  @@index([suggestedReorderQty])
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B8.2 predictive inventory optimization schema.");
