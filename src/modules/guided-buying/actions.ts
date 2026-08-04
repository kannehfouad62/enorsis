"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

export async function createCatalogAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_MANAGER",
    "BUYER",
    "SUPPLIER_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  await prisma.procurementCatalog.create({
    data: {
      tenantId: user.tenantId,
      supplierId: field(formData, "supplierId") || null,
      name: field(formData, "name"),
      description: field(formData, "description") || null,
      type: field(formData, "type") as "INTERNAL" | "SUPPLIER" | "CONTRACT" | "PUNCHOUT",
      currencyCode: field(formData, "currencyCode") || "USD",
      validFrom: field(formData, "validFrom") ? new Date(field(formData, "validFrom")) : null,
      validUntil: field(formData, "validUntil") ? new Date(field(formData, "validUntil")) : null,
      contractReference: field(formData, "contractReference") || null,
      punchoutUrl: field(formData, "punchoutUrl") || null,
      ownerUserId: user.id,
    },
  });

  revalidatePath("/app/buying");
}

export async function activateCatalogAction(formData: FormData) {
  const user = await requireAnyRole(["PROCUREMENT_MANAGER", "TENANT_ADMIN", "TENANT_OWNER"]);
  const catalogId = field(formData, "catalogId");

  const catalog = await prisma.procurementCatalog.findFirstOrThrow({
    where: { id: catalogId, tenantId: user.tenantId, status: "DRAFT" },
  });

  await prisma.procurementCatalog.update({
    where: { id: catalog.id },
    data: { status: "ACTIVE", activatedByUserId: user.id, activatedAt: new Date() },
  });

  revalidatePath("/app/buying");
}

export async function addCatalogItemAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_MANAGER",
    "BUYER",
    "SUPPLIER_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);
  const procurementCatalogId = field(formData, "procurementCatalogId");

  await prisma.procurementCatalog.findFirstOrThrow({
    where: { id: procurementCatalogId, tenantId: user.tenantId },
  });

  await prisma.procurementCatalogItem.create({
    data: {
      procurementCatalogId,
      sku: field(formData, "sku"),
      supplierSku: field(formData, "supplierSku") || null,
      name: field(formData, "name"),
      description: field(formData, "description") || null,
      category: field(formData, "category"),
      unitOfMeasure: field(formData, "unitOfMeasure"),
      unitPrice: Number(field(formData, "unitPrice")),
      minimumQuantity: Number(field(formData, "minimumQuantity") || 1),
      maximumQuantity: field(formData, "maximumQuantity") ? Number(field(formData, "maximumQuantity")) : null,
      leadTimeDays: field(formData, "leadTimeDays") ? Number(field(formData, "leadTimeDays")) : null,
      preferred: formData.get("preferred") === "on",
      environmentallyPreferred: formData.get("environmentallyPreferred") === "on",
      diversityQualified: formData.get("diversityQualified") === "on",
    },
  });

  revalidatePath("/app/buying");
}

export async function addItemToCartAction(formData: FormData) {
  const user = await requireAnyRole([
    "REQUESTER",
    "BUYER",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);
  const catalogItemId = field(formData, "catalogItemId");
  const quantity = Number(field(formData, "quantity") || 1);

  const item = await prisma.procurementCatalogItem.findFirstOrThrow({
    where: {
      id: catalogItemId,
      status: "ACTIVE",
      catalog: { tenantId: user.tenantId, status: "ACTIVE" },
    },
  });

  let cart = await prisma.guidedCart.findFirst({
    where: {
      tenantId: user.tenantId,
      requesterUserId: user.id,
      status: "DRAFT",
    },
  });

  if (!cart) {
    cart = await prisma.guidedCart.create({
      data: {
        tenantId: user.tenantId,
        requesterUserId: user.id,
        currencyCode: "USD",
      },
    });
  }

  const lineTotal = Number(item.unitPrice) * quantity;

  await prisma.guidedCartItem.upsert({
    where: {
      guidedCartId_catalogItemId: {
        guidedCartId: cart.id,
        catalogItemId: item.id,
      },
    },
    update: { quantity, unitPrice: item.unitPrice, lineTotal },
    create: {
      guidedCartId: cart.id,
      catalogItemId: item.id,
      quantity,
      unitPrice: item.unitPrice,
      lineTotal,
    },
  });

  const lines = await prisma.guidedCartItem.findMany({
    where: { guidedCartId: cart.id },
  });

  await prisma.guidedCart.update({
    where: { id: cart.id },
    data: {
      totalAmount: lines.reduce((sum, line) => sum + Number(line.lineTotal), 0),
    },
  });

  revalidatePath("/app/buying");
}

export async function submitGuidedCartAction(formData: FormData) {
  const user = await requireAnyRole([
    "REQUESTER",
    "BUYER",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);
  const cartId = field(formData, "cartId");

  const cart = await prisma.guidedCart.findFirstOrThrow({
    where: {
      id: cartId,
      tenantId: user.tenantId,
      requesterUserId: user.id,
      status: "DRAFT",
    },
    include: { items: true },
  });

  if (cart.items.length === 0) {
    throw new Error("A guided cart must contain at least one item.");
  }

  await prisma.guidedCart.update({
    where: { id: cart.id },
    data: {
      status: "SUBMITTED",
      businessPurpose: field(formData, "businessPurpose"),
      deliveryLocation: field(formData, "deliveryLocation") || null,
      neededBy: field(formData, "neededBy") ? new Date(field(formData, "neededBy")) : null,
      submittedAt: new Date(),
    },
  });

  revalidatePath("/app/buying");
}
