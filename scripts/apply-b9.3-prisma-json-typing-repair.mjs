#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/core/autonomous-procurement/execution-engine.ts",
);

let source = fs.readFileSync(file, "utf8");

const oldLine = "          payload: envelope.executionPayload,";
const newLine =
  "          payload: JSON.parse(JSON.stringify(envelope.executionPayload)) as Prisma.InputJsonValue,";

if (source.includes(newLine)) {
  console.log("B9.3 handoff payload typing is already repaired.");
  process.exit(0);
}

if (!source.includes(oldLine)) {
  throw new Error(
    "Could not locate the AutonomousExecutionHandoff payload assignment.",
  );
}

source = source.replace(oldLine, newLine);

fs.writeFileSync(file, source);

console.log(
  "Converted persisted execution payload to Prisma InputJsonValue for handoff creation.",
);
console.log("B9.3 Prisma JSON typing repair complete.");
