#!/usr/bin/env node
import fs from "node:fs";

const failures = [];
const read = (path) =>
  fs.existsSync(path)
    ? fs.readFileSync(path, "utf8")
    : "";

const schema = read("prisma/schema.prisma");
const types = read(
  "src/core/marketplace-commerce/types.ts",
);
const add = read(
  "src/components/marketplace/MarketplaceAddToCartButton.tsx",
);
const checkout = read(
  "src/components/marketplace/MarketplaceCheckout.tsx",
);
const actions = read(
  "src/modules/marketplace-commerce/actions.ts",
);
const catalogActions = read(
  "src/modules/marketplace-catalog/actions.ts",
);
const newPage = read(
  "src/app/app/marketplace/catalog/new/page.tsx",
);
const editPage = read(
  "src/app/app/marketplace/catalog/[id]/edit/page.tsx",
);
const comparison = read(
  "src/components/marketplace/MarketplaceComparisonResults.tsx",
);

if (!schema.includes("availableSizes")) {
  failures.push(
    "SupplierMarketplaceOffering.availableSizes is missing.",
  );
}

if (!schema.includes("selectedSize")) {
  failures.push(
    "MarketplacePurchaseRequestLineBinding.selectedSize is missing.",
  );
}

if (
  !types.includes("availableSizes: string[]") ||
  !types.includes("selectedSize: string | null")
) {
  failures.push("Marketplace cart size types are incomplete.");
}

if (!newPage.includes('name="availableSizes"')) {
  failures.push("Publish Offering size field is missing.");
}

if (!editPage.includes('name="availableSizes"')) {
  failures.push("Edit Offering size field is missing.");
}

if (
  !catalogActions.includes(
    'field(data, "availableSizes")',
  )
) {
  failures.push(
    "Offering create/update actions do not persist available sizes.",
  );
}

if (!add.includes("Select size")) {
  failures.push(
    "Buyer Add to Cart size selector is missing.",
  );
}

if (
  !add.includes(
    "entry.selectedSize === normalizedSize",
  )
) {
  failures.push(
    "Cart does not distinguish same offering by selected size.",
  );
}

if (!checkout.includes("cartLineKey")) {
  failures.push(
    "Checkout does not preserve separate size variant lines.",
  );
}

if (
  !actions.includes(
    "offering.availableSizes.includes",
  )
) {
  failures.push(
    "Server-side available-size validation is missing.",
  );
}

if (
  !actions.includes(
    "selectedSize: line.selectedSize",
  )
) {
  failures.push(
    "Selected size is not persisted into marketplace PR binding.",
  );
}

if (
  !actions.includes(
    "Size ${line.selectedSize}",
  )
) {
  failures.push(
    "Selected size is not propagated into Purchase Request description.",
  );
}

if (
  !comparison.includes(
    "offer.offering.availableSizes",
  )
) {
  failures.push(
    "Marketplace catalog does not display/pass available sizes.",
  );
}

if (failures.length) {
  console.error("B13.10.20 validation failed:");
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.20 marketplace wearable size variants validation passed.",
);
