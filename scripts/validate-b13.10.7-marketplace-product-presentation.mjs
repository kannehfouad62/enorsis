#!/usr/bin/env node
import fs from "node:fs";

const failures = [];

const page = fs.readFileSync(
  "src/components/marketplace/MarketplaceComparisonResults.tsx",
  "utf8",
);

const gallery = fs.readFileSync(
  "src/components/marketplace/MarketplaceProductGallery.tsx",
  "utf8",
);

if (!page.includes("MarketplaceProductGallery")) {
  failures.push("Marketplace product gallery is not rendered.");
}

if (
  !page.includes(
    "representative.offering.shortDescription",
  )
) {
  failures.push("Short description is not rendered.");
}

if (!page.includes("View full description")) {
  failures.push("Expandable long description is missing.");
}

if (!gallery.includes("Previous product image")) {
  failures.push("Gallery previous-image control is missing.");
}

if (!gallery.includes("Next product image")) {
  failures.push("Gallery next-image control is missing.");
}

if (!gallery.includes("ordered.length")) {
  failures.push("Gallery image counter logic is missing.");
}

if (!gallery.includes("setIndex(itemIndex)")) {
  failures.push("Gallery thumbnail selection is missing.");
}

if (failures.length) {
  console.error(
    "B13.10.7 marketplace product presentation validation failed:",
  );
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.7 marketplace product descriptions and photo gallery validation passed.",
);
