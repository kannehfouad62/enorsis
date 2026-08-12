#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync(
  "src/app/globals.css",
  "utf8",
);

const failures = [];

if (!source.includes("cursor:pointer")) {
  failures.push(
    "Global pointer cursor behavior is missing.",
  );
}

if (
  !source.includes(
    "button:not(:disabled)",
  )
) {
  failures.push(
    "Enabled button pointer/hover behavior is missing.",
  );
}

if (
  !source.includes(
    'input[type="checkbox"]:not(:disabled)',
  )
) {
  failures.push(
    "Checkbox interactive cursor behavior is missing.",
  );
}

if (!source.includes("summary:hover")) {
  failures.push(
    "Expandable summary hover feedback is missing.",
  );
}

if (!source.includes("focus-visible")) {
  failures.push(
    "Keyboard focus indication is missing.",
  );
}

if (!source.includes("cursor:not-allowed")) {
  failures.push(
    "Disabled-control cursor feedback is missing.",
  );
}

if (
  !source.includes(
    "transform:translateY(1px)",
  )
) {
  failures.push(
    "Active/click feedback is missing.",
  );
}

if (failures.length) {
  console.error(
    "B13.10.11 validation failed:",
  );
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.11 global interactive cursor and affordance validation passed.",
);
