#!/usr/bin/env node
import fs from "node:fs";

const failures = [];
const read = (path) =>
  fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";

const orchestration = read("src/core/finance-automation/receipt-finance-orchestration.ts");
const p2p = read("src/modules/procure-to-pay/actions.ts");
const receipt = read("src/core/requisition-to-order/goods-receipt.ts");
const query = read("src/modules/marketplace-catalog/queries.ts");
const catalog = read("src/app/app/marketplace/catalog/page.tsx");
const directory = read("src/components/marketplace/MarketplaceVendorDirectory.tsx");

if (!orchestration.includes("advanceClassicProcureToPayAfterReceipt")) failures.push("Classic receipt-to-finance orchestration is missing.");
if (!orchestration.includes("PAYMENT_READY")) failures.push("Automatic exact-match payment readiness is missing.");
if (!orchestration.includes("InvoiceRequiredAfterReceipt")) failures.push("Missing-invoice AP trigger is absent.");
if (!p2p.includes("advanceClassicProcureToPayAfterReceipt")) failures.push("Classic receipt posting does not invoke finance automation.");
if (!receipt.includes("advanceGovernedRtoAfterReceipt")) failures.push("Governed goods receipt does not invoke finance automation.");
if (!orchestration.includes("approveThreeWayMatchForPayment")) failures.push("Matched governed cases are not auto-approved for payment.");
if (!orchestration.includes("approvePaymentReadiness")) failures.push("READY governed payment cases are not auto-approved.");
if (!query.includes("vendorDirectory") || !query.includes("selectedVendor")) failures.push("Vendor-first marketplace query data is missing.");
if (!catalog.includes("Browse by supplier") || !catalog.includes("MarketplaceVendorDirectory")) failures.push("Buyer catalog vendor-first landing UI is missing.");
if (!directory.includes("View vendor offerings")) failures.push("Vendor directory cards are incomplete.");

if (failures.length) {
  console.error("B13.10.14 validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "B13.10.14 receipt-driven finance automation and vendor-first marketplace validation passed.",
);
