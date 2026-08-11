#!/usr/bin/env node
import fs from "node:fs";

function patch(path, transform) {
  const before = fs.readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) {
    console.log(`No change required: ${path}`);
    return;
  }
  fs.writeFileSync(path, after);
  console.log(`Updated: ${path}`);
}

patch("src/components/marketplace/MarketplaceComparisonResults.tsx", (source) => {
  if (!source.includes("MarketplaceAddToCartButton")) {
    source = source.replace(
      `} from "lucide-react";`,
      `} from "lucide-react";
import { MarketplaceAddToCartButton } from "@/components/marketplace/MarketplaceAddToCartButton";`,
    );
  }

  if (!source.includes(">Action</th>")) {
    source = source.replace(
      `                          <th className="px-4 py-3">
                            SKU
                          </th>`,
      `                          <th className="px-4 py-3">
                            SKU
                          </th>
                          <th className="px-4 py-3">Action</th>`,
    );
  }

  const cell = `                              <td className="px-4 py-4 text-slate-500">
                                {offer.offering
                                  .sku ?? "—"}
                              </td>`;

  if (source.includes(cell) && !source.includes("sellerTenantId: offer.offering.tenantId")) {
    source = source.replace(
      cell,
      `${cell}
                              <td className="px-4 py-4">
                                {offer.offering.unitPrice != null &&
                                offer.offering.availabilityStatus !== "UNAVAILABLE" ? (
                                  <MarketplaceAddToCartButton
                                    item={{
                                      offeringId: offer.offering.id,
                                      sellerTenantId: offer.offering.tenantId,
                                      sellerSupplierId: offer.offering.supplierId,
                                      supplierName:
                                        offer.supplier.tradingName ??
                                        offer.supplier.legalName,
                                      offeringName: offer.offering.name,
                                      sku: offer.offering.sku,
                                      category: offer.offering.category,
                                      unitOfMeasure: offer.offering.unitOfMeasure ?? "EA",
                                      unitPrice: Number(offer.offering.unitPrice),
                                      currencyCode: offer.offering.currencyCode,
                                      minimumOrderQty:
                                        offer.offering.minimumOrderQty == null
                                          ? null
                                          : Number(offer.offering.minimumOrderQty),
                                      leadTimeDays: offer.offering.leadTimeDays,
                                      imageRef: offer.offering.imageRef,
                                    }}
                                  />
                                ) : (
                                  <span className="text-xs font-semibold text-slate-500">
                                    Request quote
                                  </span>
                                )}
                              </td>`,
    );
  }
  return source;
});

patch("src/app/app/marketplace/catalog/page.tsx", (source) => {
  if (!source.includes("MarketplaceCartLink")) {
    source = source.replace(
      `import { MarketplaceDirectImageUpload } from "@/components/marketplace/MarketplaceDirectImageUpload";`,
      `import { MarketplaceDirectImageUpload } from "@/components/marketplace/MarketplaceDirectImageUpload";
import { MarketplaceCartLink } from "@/components/marketplace/MarketplaceCartLink";`,
    );
  }

  const start = `          <div className="flex gap-2">
            <Link
              href="/app/marketplace/suppliers"`;
  if (source.includes(start) && !source.includes("<MarketplaceCartLink")) {
    source = source.replace(
      start,
      `          <div className="flex flex-wrap gap-2">
            <MarketplaceCartLink />
            <Link
              href="/app/marketplace/suppliers"`,
    );
  }
  return source;
});

patch("src/modules/purchase-requests/actions.ts", (source) => {
  if (!source.includes("handleMarketplacePurchaseRequestDecision")) {
    source = source.replace(
      `import {
  approvalDecisionSchema,`,
      `import { handleMarketplacePurchaseRequestDecision } from "@/core/marketplace-commerce/orchestration";
import {
  approvalDecisionSchema,`,
    );
  }

  const marker = `  revalidatePath("/app/requests");
  revalidatePath(\`/app/requests/\${request.id}\`);
}

export async function cancelPurchaseRequestAction`;

  if (source.includes(marker) && !source.includes("nextStatus,\n    decision: input.decision")) {
    source = source.replace(
      marker,
      `  await handleMarketplacePurchaseRequestDecision({
    purchaseRequestId: request.id,
    nextStatus,
    decision: input.decision,
    comments: input.comments,
    actorUserId: user.id,
  });

  revalidatePath("/app/requests");
  revalidatePath(\`/app/requests/\${request.id}\`);
}

export async function cancelPurchaseRequestAction`,
    );
  }
  return source;
});

patch("src/modules/navigation/enterprise-modules.ts", (source) => {
  source = source.replace(
    `    title: "Marketplace Product Catalog",
    description:
      "Publish and discover supplier products and services with pricing, availability, category and regional metadata.",
    href: "/app/marketplace/catalog",
    icon: PackageSearch,
    group: "Suppliers",`,
    `    title: "Marketplace Product Catalog",
    description:
      "Discover supplier products and services, compare offers and submit governed marketplace Purchase Requests.",
    href: "/app/marketplace/catalog",
    icon: PackageSearch,
    group: "Procurement",`,
  );

  if (!source.includes('href: "/app/marketplace/cart"')) {
    source = source.replace(
      `  {
    title: "Purchase Requests",`,
      `  {
    title: "Marketplace Purchase Cart",
    description:
      "Review selected marketplace offers and submit them as governed Purchase Requests.",
    href: "/app/marketplace/cart",
    icon: ShoppingCart,
    group: "Procurement",
  },
  {
    title: "Purchase Requests",`,
    );
  }
  return source;
});

patch("src/core/modules/registry.ts", (source) => {
  source = source.replace(
    `"/app/marketplace/catalog": { id: "marketplace-product-catalog", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT }`,
    `"/app/marketplace/catalog": { id: "marketplace-product-catalog", featureKey: FEATURE_KEYS.CORE_PROCUREMENT, roles: procurementRoles }`,
  );

  if (!source.includes('"/app/marketplace/cart"')) {
    source = source.replace(
      `  "/app/marketplace/catalog": { id: "marketplace-product-catalog", featureKey: FEATURE_KEYS.CORE_PROCUREMENT, roles: procurementRoles },`,
      `  "/app/marketplace/catalog": { id: "marketplace-product-catalog", featureKey: FEATURE_KEYS.CORE_PROCUREMENT, roles: procurementRoles },
  "/app/marketplace/cart": { id: "marketplace-purchase-cart", featureKey: FEATURE_KEYS.CORE_PROCUREMENT, roles: procurementRoles },
  "/app/marketplace/orders": { id: "marketplace-seller-orders", featureKey: FEATURE_KEYS.SUPPLIER_MANAGEMENT, roles: supplierRoles },`,
    );
  }
  return source;
});

patch("src/components/command-center/SupplierCommandCenter.tsx", (source) => {
  if (source.includes('href: "/app/marketplace/orders"')) return source;
  const marker = `  {
    title: "Publish Offering",`;
  if (!source.includes(marker)) {
    throw new Error("Could not locate Supplier Command Center Publish Offering card.");
  }
  return source.replace(
    marker,
    `  {
    title: "Marketplace Orders",
    description:
      "Review buyer purchase orders, accept or reject orders, and record shipment tracking.",
    href: "/app/marketplace/orders",
    icon: PackageCheck,
  },
${marker}`,
  );
});

console.log("B13.10.5 marketplace commerce integration complete.");
