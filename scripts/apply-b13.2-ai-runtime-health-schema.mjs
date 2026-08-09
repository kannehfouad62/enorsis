#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model AiRuntimeHealthSnapshot")) {
  console.log("B13.2 AI runtime health snapshot schema already present.");
  process.exit(0);
}

schema += `

model AiRuntimeHealthSnapshot {
  id                    String   @id @default(cuid())
  tenantId              String
  status                String
  healthScore           Float
  decisionCount         Int      @default(0)
  activePolicyRate      Float    @default(0)
  fallbackRate          Float    @default(0)
  deniedRate            Float    @default(0)
  clampedRate           Float    @default(0)
  traceIntegrityRate    Float    @default(100)
  activePolicyCount     Int      @default(0)
  advisoryPolicyCount   Int      @default(0)
  certificationStatus   String?
  certificationScore    Float?
  adoptionMode          String?
  anomalyCount          Int      @default(0)
  metrics               Json
  anomalies             Json
  capturedAt            DateTime @default(now())
  createdAt             DateTime @default(now())

  @@index([tenantId, capturedAt], map: "AiHealth_captured_idx")
  @@index([tenantId, status], map: "AiHealth_status_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B13.2 AI runtime health snapshot schema.");
