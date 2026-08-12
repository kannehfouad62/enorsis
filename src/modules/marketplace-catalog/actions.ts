"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import { ensureTenantSelfSupplierProfile } from "@/core/marketplace/tenant-self-supplier";
import { deleteMarketplaceImage } from "@/modules/marketplace-catalog/media";

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

  const supplier =
    await ensureTenantSelfSupplierProfile({
      tenantId: user.tenantId,
      actorUserId: user.id,
      actorEmail: user.email,
    });

  const supplierId = supplier.id;

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
  redirect("/app/marketplace/catalog?created=1");
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


export async function setMarketplaceOfferingPrimaryImageAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const mediaId = field(data, "mediaId");
  const media = await prisma.supplierMarketplaceOfferingMedia.findFirstOrThrow({ where: { id: mediaId, tenantId: user.tenantId } });
  await prisma.$transaction([
    prisma.supplierMarketplaceOfferingMedia.updateMany({ where: { offeringId: media.offeringId, tenantId: user.tenantId }, data: { isPrimary: false } }),
    prisma.supplierMarketplaceOfferingMedia.update({ where: { id: media.id }, data: { isPrimary: true } }),
    prisma.supplierMarketplaceOffering.update({ where: { id: media.offeringId }, data: { imageRef: media.pathname } }),
  ]);
  revalidatePath("/app/marketplace/catalog");
}

export async function deleteMarketplaceOfferingImageAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const mediaId = field(data, "mediaId");
  const media = await prisma.supplierMarketplaceOfferingMedia.findFirstOrThrow({ where: { id: mediaId, tenantId: user.tenantId } });
  await deleteMarketplaceImage(media.pathname);
  await prisma.supplierMarketplaceOfferingMedia.delete({ where: { id: media.id } });
  if (media.isPrimary) {
    const next = await prisma.supplierMarketplaceOfferingMedia.findFirst({ where: { offeringId: media.offeringId, tenantId: user.tenantId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
    if (next) await prisma.supplierMarketplaceOfferingMedia.update({ where: { id: next.id }, data: { isPrimary: true } });
    await prisma.supplierMarketplaceOffering.update({ where: { id: media.offeringId }, data: { imageRef: next?.pathname ?? null } });
  }
  revalidatePath("/app/marketplace/catalog");
}


export async function updateMarketplaceOfferingDetailsAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);
  const offeringId = field(data, "offeringId");

  const current =
    await prisma.supplierMarketplaceOffering.findFirst({
      where: {
        id: offeringId,
        tenantId: user.tenantId,
      },
    });

  if (!current) {
    throw new Error(
      "Marketplace offering was not found for this tenant.",
    );
  }

  const marketplaceVisible =
    field(data, "marketplaceVisible") === "true";

  const updated =
    await prisma.supplierMarketplaceOffering.update({
      where: { id: current.id },
      data: {
        offeringType:
          field(data, "offeringType") || current.offeringType,
        sku: field(data, "sku") || null,
        name: field(data, "name"),
        shortDescription:
          field(data, "shortDescription") || null,
        description:
          field(data, "description") || null,
        category:
          field(data, "category") || null,
        subcategory:
          field(data, "subcategory") || null,
        manufacturer:
          field(data, "manufacturer") || null,
        brand:
          field(data, "brand") || null,
        modelNumber:
          field(data, "modelNumber") || null,
        unitOfMeasure:
          field(data, "unitOfMeasure") || null,
        currencyCode:
          field(data, "currencyCode").toUpperCase() ||
          current.currencyCode,
        unitPrice:
          field(data, "unitPrice") || null,
        minimumOrderQty:
          field(data, "minimumOrderQty") || null,
        leadTimeDays:
          field(data, "leadTimeDays")
            ? Number(field(data, "leadTimeDays"))
            : null,
        availabilityStatus:
          field(data, "availabilityStatus") ||
          current.availabilityStatus,
        countriesAvailable: list(
          field(data, "countriesAvailable"),
        ),
        certifications: list(
          field(data, "certifications"),
        ),
        keywords: list(
          field(data, "keywords"),
        ),
        documentRef:
          field(data, "documentRef") || null,
        externalUrl:
          field(data, "externalUrl") || null,
        marketplaceVisible,
        featured:
          field(data, "featured") === "true",
        publishedAt:
          marketplaceVisible
            ? current.publishedAt ?? new Date()
            : null,
      },
    });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Marketplace administrator",
      action: "supplier_marketplace.offering.update",
      resourceType: "SupplierMarketplaceOffering",
      resourceId: current.id,
      before: {
        name: current.name,
        sku: current.sku,
        unitPrice: current.unitPrice,
        currencyCode: current.currencyCode,
        availabilityStatus:
          current.availabilityStatus,
        marketplaceVisible:
          current.marketplaceVisible,
        featured: current.featured,
        countriesAvailable:
          current.countriesAvailable,
      },
      after: {
        name: updated.name,
        sku: updated.sku,
        unitPrice: updated.unitPrice,
        currencyCode: updated.currencyCode,
        availabilityStatus:
          updated.availabilityStatus,
        marketplaceVisible:
          updated.marketplaceVisible,
        featured: updated.featured,
        countriesAvailable:
          updated.countriesAvailable,
      },
    },
  });

  revalidatePath("/app/marketplace/catalog");
  revalidatePath(
    `/app/marketplace/catalog/${current.id}/edit`,
  );
  redirect("/app/marketplace/catalog?updated=1");
}
