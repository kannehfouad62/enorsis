#!/usr/bin/env node
import fs from "node:fs";

const failures = [];
const read = (path) => fs.readFileSync(path, "utf8");

const notificationService = read("src/core/notifications/service.ts");
const marketplaceNotifications = read("src/core/marketplace-commerce/notifications.ts");
const marketplaceActions = read("src/modules/marketplace-commerce/actions.ts");
const warehouseQueries = read("src/modules/warehouse-operations/queries.ts");
const warehouseActions = read("src/modules/warehouse-operations/actions.ts");
const warehousePage = read("src/app/app/warehouse-operations/page.tsx");
const warehouseComponent = read("src/components/warehouse/MarketplaceInboundReceivingForm.tsx");

if (!notificationService.includes("createAndDeliverEnterpriseNotification")) {
  failures.push("Immediate targeted notification delivery helper is missing.");
}
if (!marketplaceNotifications.includes("createAndDeliverEnterpriseNotification")) {
  failures.push("Marketplace notification helpers still only queue delivery.");
}
if (!marketplaceNotifications.includes("notifyBuyerWarehouseTeam")) {
  failures.push("Buyer warehouse-team notification bridge is missing.");
}
if (!marketplaceActions.includes("MarketplaceOrder.ReadyForReceiving")) {
  failures.push("Supplier acceptance does not notify receiving stakeholders.");
}
if (!marketplaceActions.includes("MarketplaceOrder.InboundShipment")) {
  failures.push("Supplier shipment does not notify receiving stakeholders.");
}
if (!warehouseQueries.includes("marketplaceInboundLines")) {
  failures.push("Warehouse workspace does not resolve accepted marketplace lines.");
}
if (!warehouseComponent.includes("Accepted / shipped marketplace product")) {
  failures.push("Receive shipment marketplace dropdown is missing.");
}
if (!warehouseComponent.includes("serialLotReference")) {
  failures.push("Physical serial/lot capture is missing from marketplace receiving.");
}
if (!warehouseActions.includes("warehouse.marketplace_receiving.recorded")) {
  failures.push("Marketplace receiving handoff is not audit logged.");
}
if (!warehousePage.includes("Marketplace accepted orders")) {
  failures.push("Warehouse page is not wired to the marketplace inbound bridge.");
}

if (failures.length) {
  console.error("B13.10.15 validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "B13.10.15 reliable notifications and procurement-to-warehouse handoff validation passed.",
);
