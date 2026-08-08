#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model PredictiveProcurementForecastRun")) {
  console.log("B8.1 predictive procurement schema already present.");
  process.exit(0);
}

schema += `

model PredictiveProcurementForecastRun {
  id                String   @id @default(cuid())
  tenantId          String
  createdByUserId   String
  horizonDays       Int      @default(90)
  modelVersion      String   @default("ENORSIS_PREDICTIVE_V1")
  status            String   @default("COMPLETED")
  sourceWindowStart DateTime
  sourceWindowEnd   DateTime
  assumptions       Json?
  generatedAt       DateTime @default(now())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([tenantId, generatedAt])
  @@index([tenantId, status])
}

model PredictiveProcurementForecastSignal {
  id             String   @id @default(cuid())
  tenantId       String
  forecastRunId  String
  signalType     String
  scopeKey       String
  scopeLabel     String
  currentValue   Decimal? @db.Decimal(20, 4)
  forecastValue  Decimal? @db.Decimal(20, 4)
  changePercent  Decimal? @db.Decimal(10, 4)
  confidence     Decimal? @db.Decimal(6, 2)
  riskLevel      String   @default("LOW")
  evidence       Json
  createdAt      DateTime @default(now())

  @@index([tenantId, forecastRunId, signalType])
  @@index([tenantId, riskLevel])
  @@index([scopeKey])
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B8.1 predictive procurement forecast schema.");
