#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "prisma/schema.prisma");
let source = fs.readFileSync(file, "utf8");

const oldLine =
  '  @@index([tenantId, digitalTwinRunId, impactType])';

const newLine =
  '  @@index([tenantId, digitalTwinRunId, impactType], map: "PDigitalTwinImpact_run_type_idx")';

if (source.includes(newLine)) {
  console.log("B8.4 Digital Twin index already has a stable mapped name.");
  process.exit(0);
}

if (!source.includes(oldLine)) {
  throw new Error(
    "Could not locate ProcurementDigitalTwinImpact composite index in prisma/schema.prisma.",
  );
}

source = source.replace(oldLine, newLine);
fs.writeFileSync(file, source);

console.log("Mapped B8.4 Digital Twin impact index to a stable short PostgreSQL name.");
