#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model ClosedLoopRuntimePolicyAdoption")) {
  console.log("B12.8 runtime policy adoption schema already present.");
  process.exit(0);
}

schema += `

model ClosedLoopRuntimePolicyAdoption {
  id                 String   @id @default(cuid())
  tenantId           String
  decisionPath       String
  policyType         String
  scopeStrategy      String
  mode               String   @default("OFF")
  defaultThreshold   Float
  minimumValue       Float    @default(0)
  maximumValue       Float    @default(100)
  status             String   @default("ACTIVE")
  activatedByUserId  String?
  activatedAt        DateTime?
  updatedByUserId    String?
  lastDecisionAt     DateTime?
  decisionCount      Int      @default(0)
  shadowDifferenceCount Int   @default(0)
  rationale          String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([tenantId, decisionPath], map: "RuntimeAdopt_path_key")
  @@index([tenantId, mode, status], map: "RuntimeAdopt_mode_idx")
}

model ClosedLoopRuntimePolicyAdoptionEvent {
  id                 String   @id @default(cuid())
  tenantId           String
  adoptionId         String
  eventType          String
  actorUserId        String?
  fromMode           String?
  toMode             String?
  message            String?
  snapshot           Json
  createdAt          DateTime @default(now())

  @@index([tenantId, adoptionId, createdAt], map: "RuntimeAdoptEvent_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added B12.8 controlled runtime policy adoption schema.");
