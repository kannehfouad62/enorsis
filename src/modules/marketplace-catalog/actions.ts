"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import { deleteMarketplaceImage, MAX_OFFERING_IMAGES, uploadMarketplaceImage } from "@/modules/marketplace-catalog/media";

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

  const images = data.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
  if (images.length > MAX_OFFERING_IMAGES) throw new Error(`Upload no more than ${MAX_OFFERING_IMAGES} images per offering.`);
  for (const [position, image] of images.entries()) {
    const blob = await uploadMarketplaceImage(user.tenantId, offering.id, image);
    const media = await prisma.supplierMarketplaceOfferingMedia.create({
      data: { tenantId: user.tenantId, offeringId: offering.id, pathname: blob.pathname, contentType: image.type, sizeBytes: image.size, altText: offering.name, position, isPrimary: position === 0, uploadedByUserId: user.id },
    });
    if (position === 0) await prisma.supplierMarketplaceOffering.update({ where: { id: offering.id }, data: { imageRef: media.pathname } });
  }

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


export async function addMarketplaceOfferingImagesAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const offeringId = field(data, "offeringId");
  const offering = await prisma.supplierMarketplaceOffering.findFirstOrThrow({ where: { id: offeringId, tenantId: user.tenantId } });
  const existing = await prisma.supplierMarketplaceOfferingMedia.count({ where: { offeringId, tenantId: user.tenantId } });
  const images = data.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
  if (!images.length) throw new Error("Select at least one image.");
  if (existing + images.length > MAX_OFFERING_IMAGES) throw new Error(`An offering can contain up to ${MAX_OFFERING_IMAGES} images.`);
  for (const [offset, image] of images.entries()) {
    const blob = await uploadMarketplaceImage(user.tenantId, offeringId, image);
    const media = await prisma.supplierMarketplaceOfferingMedia.create({ data: { tenantId: user.tenantId, offeringId, pathname: blob.pathname, contentType: image.type, sizeBytes: image.size, altText: offering.name, position: existing + offset, isPrimary: existing === 0 && offset === 0, uploadedByUserId: user.id } });
    if (existing === 0 && offset === 0) await prisma.supplierMarketplaceOffering.update({ where: { id: offeringId }, data: { imageRef: media.pathname } });
  }
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
