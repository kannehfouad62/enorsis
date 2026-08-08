"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "SUPPLIER_MANAGER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const list = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export async function createMarketplaceOfferingAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const supplierId = field(data, "supplierId");

  const supplier = await prisma.supplier.findFirstOrThrow({
    where: {
      id: supplierId,
      tenantId: user.tenantId,
    },
    select: {
      id: true,
      supplierNumber: true,
    },
  });

  const profile =
    await prisma.supplierMarketplaceProfile.findFirst({
      where: {
        tenantId: user.tenantId,
        supplierId,
      },
      select: { id: true },
    });

  const marketplaceVisible =
    field(data, "marketplaceVisible") === "true";

  const offering =
    await prisma.supplierMarketplaceOffering.create({
      data: {
        tenantId: user.tenantId,
        supplierId,
        marketplaceProfileId: profile?.id ?? null,
        offeringType:
          field(data, "offeringType") || "PRODUCT",
        sku: field(data, "sku") || null,
        name: field(data, "name"),
        shortDescription:
          field(data, "shortDescription") || null,
        description: field(data, "description") || null,
        category: field(data, "category") || null,
        subcategory: field(data, "subcategory") || null,
        manufacturer: field(data, "manufacturer") || null,
        brand: field(data, "brand") || null,
        modelNumber: field(data, "modelNumber") || null,
        unitOfMeasure:
          field(data, "unitOfMeasure") || null,
        currencyCode:
          field(data, "currencyCode").toUpperCase() ||
          "USD",
        unitPrice: field(data, "unitPrice") || null,
        minimumOrderQty:
          field(data, "minimumOrderQty") || null,
        leadTimeDays: field(data, "leadTimeDays")
          ? Number(field(data, "leadTimeDays"))
          : null,
        availabilityStatus:
          field(data, "availabilityStatus") ||
          "AVAILABLE",
        countriesAvailable: list(
          field(data, "countriesAvailable"),
        ),
        certifications: list(
          field(data, "certifications"),
        ),
        keywords: list(field(data, "keywords")),
        imageRef: field(data, "imageRef") || null,
        documentRef: field(data, "documentRef") || null,
        externalUrl: field(data, "externalUrl") || null,
        marketplaceVisible,
        featured: field(data, "featured") === "true",
        publishedAt: marketplaceVisible
          ? new Date()
          : null,
        createdByUserId: user.id,
      },
    });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email ?? "Marketplace administrator",
      action: "supplier_marketplace.offering.create",
      resourceType: "SupplierMarketplaceOffering",
      resourceId: offering.id,
      after: {
        supplierId,
        supplierNumber: supplier.supplierNumber,
        offeringType: offering.offeringType,
        sku: offering.sku,
        marketplaceVisible,
      },
    },
  });

  revalidatePath("/app/marketplace/catalog");
}

export async function updateMarketplaceOfferingStatusAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const offeringId = field(data, "offeringId");
  const marketplaceVisible =
    field(data, "marketplaceVisible") === "true";
  const featured = field(data, "featured") === "true";

  await prisma.supplierMarketplaceOffering.updateMany({
    where: {
      id: offeringId,
      tenantId: user.tenantId,
    },
    data: {
      marketplaceVisible,
      featured,
      publishedAt: marketplaceVisible
        ? new Date()
        : null,
    },
  });

  revalidatePath("/app/marketplace/catalog");
}
