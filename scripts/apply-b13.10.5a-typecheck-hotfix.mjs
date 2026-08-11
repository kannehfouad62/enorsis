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

patch(
  "src/core/marketplace-commerce/notifications.ts",
  (source) => {
    if (!source.includes('PlatformRole')) {
      source = source.replace(
        'import { createEnterpriseNotification } from "@/core/notifications";',
        'import { createEnterpriseNotification } from "@/core/notifications";\nimport type { PlatformRole } from "@/generated/prisma/enums";',
      );
    }

    source = source.replace(
      `const SELLER_NOTIFICATION_ROLES = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "SUPPLIER_MANAGER",
];`,
      `const SELLER_NOTIFICATION_ROLES: PlatformRole[] = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "SUPPLIER_MANAGER",
];`,
    );

    source = source.replace(
      `  priority?: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";`,
      `  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";`,
    );

    return source;
  },
);

patch(
  "src/modules/marketplace-commerce/actions.ts",
  (source) => {
    const oldQuery = `  const offerings = await prisma.supplierMarketplaceOffering.findMany({
    where: { id: { in: requestedIds }, marketplaceVisible: true },
    include: {
      supplier: true,
      media: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
      },
    },
  });

  if (offerings.length !== requestedIds.length) {
    throw new Error("One or more marketplace offerings are no longer available.");
  }

  const offeringMap = new Map(offerings.map((item) => [item.id, item]));
  const trustedLines = input.items.map((cartItem) => {
    const offering = offeringMap.get(cartItem.offeringId);`;

    const newQuery = `  const offerings = await prisma.supplierMarketplaceOffering.findMany({
    where: { id: { in: requestedIds }, marketplaceVisible: true },
  });

  if (offerings.length !== requestedIds.length) {
    throw new Error("One or more marketplace offerings are no longer available.");
  }

  const supplierIds = Array.from(
    new Set(offerings.map((offering) => offering.supplierId)),
  );

  const [suppliers, media] = await Promise.all([
    prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: {
        id: true,
        legalName: true,
        tradingName: true,
      },
    }),
    prisma.supplierMarketplaceOfferingMedia.findMany({
      where: { offeringId: { in: requestedIds } },
      orderBy: [
        { isPrimary: "desc" },
        { position: "asc" },
        { createdAt: "asc" },
      ],
    }),
  ]);

  const supplierMap = new Map(
    suppliers.map((supplier) => [supplier.id, supplier]),
  );

  const mediaByOffering = new Map<
    string,
    typeof media
  >();

  for (const item of media) {
    const current = mediaByOffering.get(item.offeringId) ?? [];
    current.push(item);
    mediaByOffering.set(item.offeringId, current);
  }

  const offeringMap = new Map(offerings.map((item) => [item.id, item]));
  const trustedLines = input.items.map((cartItem) => {
    const offering = offeringMap.get(cartItem.offeringId);`;

    if (source.includes(oldQuery)) {
      source = source.replace(oldQuery, newQuery);
    }

    const oldTrusted = `    return {
      offering,
      quantity,
      unitPrice: Number(offering.unitPrice),
      unitOfMeasure: offering.unitOfMeasure || "EA",
      supplierName: offering.supplier.tradingName ?? offering.supplier.legalName,
      primaryImage: offering.media[0]?.pathname ?? offering.imageRef ?? null,
    };`;

    const newTrusted = `    const supplier = supplierMap.get(offering.supplierId);
    if (!supplier) {
      throw new Error(
        \`Supplier record for \${offering.name} is unavailable.\`,
      );
    }

    const offeringMedia =
      mediaByOffering.get(offering.id) ?? [];

    return {
      offering,
      quantity,
      unitPrice: Number(offering.unitPrice),
      unitOfMeasure: offering.unitOfMeasure || "EA",
      supplierName:
        supplier.tradingName ?? supplier.legalName,
      primaryImage:
        offeringMedia[0]?.pathname ??
        offering.imageRef ??
        null,
    };`;

    if (source.includes(oldTrusted)) {
      source = source.replace(oldTrusted, newTrusted);
    }

    return source;
  },
);

patch("prisma/schema.prisma", (source) => {
  source = source.replace(
    `  @@index([tenantId, purchaseRequestId])
  @@index([sellerTenantId, createdAt])`,
    `  @@index([tenantId, purchaseRequestId], map: "MktPRLineBinding_tenant_request_idx")
  @@index([sellerTenantId, createdAt], map: "MktPRLineBinding_seller_created_idx")`,
  );

  source = source.replace(
    `  @@index([tenantId, offeringId, position])`,
    `  @@index([tenantId, offeringId, position], map: "MktOfferingMedia_tenant_offer_pos_idx")`,
  );

  return source;
});

console.log(
  "B13.10.5a TypeScript and Prisma index drift hotfix complete.",
);
