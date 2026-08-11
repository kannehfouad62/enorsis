#!/usr/bin/env node
import fs from "node:fs";

const failures = [];
const required = [
  "src/core/marketplace-commerce/orchestration.ts",
  "src/modules/marketplace-commerce/actions.ts",
  "src/modules/marketplace-commerce/queries.ts",
  "src/components/marketplace/MarketplaceAddToCartButton.tsx",
  "src/components/marketplace/MarketplaceCheckout.tsx",
  "src/app/app/marketplace/cart/page.tsx",
  "src/app/app/marketplace/orders/page.tsx",
];

for (const path of required) {
  if (!fs.existsSync(path)) failures.push(`Missing ${path}`);
}

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
const schema = read("prisma/schema.prisma");
const comparison = read("src/components/marketplace/MarketplaceComparisonResults.tsx");
const catalog = read("src/app/app/marketplace/catalog/page.tsx");
const requestActions = read("src/modules/purchase-requests/actions.ts");
const modules = read("src/modules/navigation/enterprise-modules.ts");
const orchestration = read("src/core/marketplace-commerce/orchestration.ts");
const actions = read("src/modules/marketplace-commerce/actions.ts");

if (!schema.includes("model MarketplacePurchaseRequestLineBinding")) failures.push("PR binding model missing.");
if (!schema.includes("model MarketplaceSellerOrder")) failures.push("Seller order model missing.");
if (!comparison.includes("MarketplaceAddToCartButton")) failures.push("Add to Cart control missing.");
if (!catalog.includes("MarketplaceCartLink")) failures.push("Purchase Cart link missing.");
if (!requestActions.includes("handleMarketplacePurchaseRequestDecision")) failures.push("Approval orchestration hook missing.");
if (!orchestration.includes("createPurchaseOrderExecution") || !orchestration.includes("validatePurchaseOrderExecution") || !orchestration.includes("issuePurchaseOrderExecution")) failures.push("Governed PO create/validate/issue chain missing.");
if (!actions.includes("purchaseRequest.create") || !actions.includes("marketplacePurchaseRequestLineBinding.create")) failures.push("Canonical PR checkout binding missing.");
if (!actions.includes("MarketplaceOrder.Shipped")) failures.push("Shipment notification missing.");
if (!modules.includes('href: "/app/marketplace/catalog"') || !modules.includes('href: "/app/marketplace/cart"')) failures.push("Buyer Enterprise Module marketplace access incomplete.");

if (failures.length) {
  console.error("B13.10.5 marketplace commerce validation failed:");
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log("B13.10.5 marketplace cart and governed commerce orchestration validation passed.");
