#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync(
  "src/components/marketplace/MarketplaceComparisonResults.tsx",
  "utf8",
);

const failures = [];

if (
  !source.includes(
    "representative.offering.shortDescription",
  )
) {
  failures.push(
    "Marketplace product cards do not render shortDescription.",
  );
}

if (
  !source.includes(
    "representative.offering.description",
  )
) {
  failures.push(
    "Marketplace product cards do not render full description.",
  );
}

if (!source.includes("View full description")) {
  failures.push(
    "Marketplace product cards do not expose the full-description control.",
  );
}

if (!source.includes("whitespace-pre-wrap")) {
  failures.push(
    "Full product descriptions do not preserve paragraph formatting.",
  );
}

if (failures.length) {
  console.error("B13.10.7 validation failed:");
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.7 marketplace product description validation passed.",
);
