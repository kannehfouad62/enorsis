#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync(
  "src/app/app/marketplace/catalog/page.tsx",
  "utf8",
);

const failures = [];

if (
  !source.includes(
    'href="/app/marketplace/seller-profile"',
  )
) {
  failures.push("Seller profile route link is missing.");
}

if (
  !source.includes(
    'aria-label="Open Marketplace Seller Profile"',
  )
) {
  failures.push("Whole-card clickable link is missing.");
}

if (
  !source.includes(
    "Click anywhere on this profile card to edit",
  )
) {
  failures.push("Clickable profile guidance is missing.");
}

if (
  !source.includes(
    "group-hover:text-blue-700",
  )
) {
  failures.push("Seller profile hover affordance is missing.");
}

if (failures.length) {
  console.error("B13.10.16a validation failed:");
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.16a clickable seller profile card validation passed.",
);
