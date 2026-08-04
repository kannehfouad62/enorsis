"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const roles = [
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "TENANT_ADMIN",
  "TENANT_OWNER",
] as const;

export async function createInventoryLocationAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  await prisma.inventoryLocation.create({
    data: {
      tenantId: user.tenantId,
      code: field(formData, "code"),
      name: field(formData, "name"),
      description: field(formData, "description") || null,
      siteId: field(formData, "siteId") || null,
      address: field(formData, "address") || null,
      ownerUserId: user.id,
    },
  });
  revalidatePath("/app/inventory");
}

export async function createInventoryItemAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  await prisma.inventoryItem.create({
    data: {
      tenantId: user.tenantId,
      sku: field(formData, "sku"),
      name: field(formData, "name"),
      description: field(formData, "description") || null,
      category: field(formData, "category"),
      unitOfMeasure: field(formData, "unitOfMeasure"),
      standardCost: field(formData, "standardCost") ? Number(field(formData, "standardCost")) : null,
      reorderPoint: Number(field(formData, "reorderPoint") || 0),
      reorderQuantity: Number(field(formData, "reorderQuantity") || 0),
      safetyStock: Number(field(formData, "safetyStock") || 0),
      leadTimeDays: field(formData, "leadTimeDays") ? Number(field(formData, "leadTimeDays")) : null,
      lotControlled: formData.get("lotControlled") === "on",
      serialControlled: formData.get("serialControlled") === "on",
    },
  });
  revalidatePath("/app/inventory");
}

export async function postInventoryTransactionAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const inventoryItemId = field(formData, "inventoryItemId");
  const inventoryLocationId = field(formData, "inventoryLocationId");
  const type = field(formData, "type") as
    | "RECEIPT" | "ISSUE" | "TRANSFER_IN" | "TRANSFER_OUT"
    | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "RETURN_TO_STOCK"
    | "RETURN_TO_SUPPLIER";
  const quantity = Number(field(formData, "quantity"));
  const direction = ["RECEIPT", "TRANSFER_IN", "ADJUSTMENT_IN", "RETURN_TO_STOCK"].includes(type) ? 1 : -1;

  await prisma.$transaction(async (tx) => {
    const balance = await tx.inventoryBalance.upsert({
      where: { inventoryItemId_inventoryLocationId: { inventoryItemId, inventoryLocationId } },
      update: {},
      create: { inventoryItemId, inventoryLocationId },
    });
    const quantityOnHand = Number(balance.quantityOnHand) + quantity * direction;
    if (quantityOnHand < 0) throw new Error("Inventory transaction would create negative stock.");
    await tx.inventoryBalance.update({
      where: { id: balance.id },
      data: {
        quantityOnHand,
        quantityAvailable: quantityOnHand - Number(balance.quantityReserved),
        averageUnitCost: field(formData, "unitCost") ? Number(field(formData, "unitCost")) : balance.averageUnitCost,
      },
    });
    await tx.inventoryTransaction.create({
      data: {
        tenantId: user.tenantId,
        inventoryItemId,
        inventoryLocationId,
        destinationLocationId: field(formData, "destinationLocationId") || null,
        type,
        quantity,
        unitCost: field(formData, "unitCost") ? Number(field(formData, "unitCost")) : null,
        referenceType: field(formData, "referenceType") || null,
        referenceId: field(formData, "referenceId") || null,
        reason: field(formData, "reason") || null,
        lotNumber: field(formData, "lotNumber") || null,
        serialNumber: field(formData, "serialNumber") || null,
        performedByUserId: user.id,
      },
    });
  });
  revalidatePath("/app/inventory");
}

export async function createCycleCountAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const inventoryLocationId = field(formData, "inventoryLocationId");
  const sequence = await prisma.cycleCount.count({ where: { tenantId: user.tenantId } });
  const balances = await prisma.inventoryBalance.findMany({ where: { inventoryLocationId } });
  await prisma.cycleCount.create({
    data: {
      tenantId: user.tenantId,
      inventoryLocationId,
      countNumber: `COUNT-${new Date().getFullYear()}-${String(sequence + 1).padStart(6, "0")}`,
      scheduledAt: new Date(field(formData, "scheduledAt")),
      ownerUserId: user.id,
      notes: field(formData, "notes") || null,
      lines: { create: balances.map((balance) => ({ inventoryItemId: balance.inventoryItemId, expectedQuantity: balance.quantityOnHand })) },
    },
  });
  revalidatePath("/app/inventory");
}
