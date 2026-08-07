"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  approveInventoryFinancialReconciliation,
  createCostLayerFromMovement,
  createInventoryFinancialReconciliation,
  refreshInventoryFinancialValuation,
  upsertInventoryValuationPolicy,
} from "@/core/inventory-financial-valuation/service";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_MANAGER",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_AUDITOR",
] as const;

export async function upsertInventoryValuationPolicyAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await upsertInventoryValuationPolicy({
    tenantId: user.tenantId,
    inventoryItemId: field(data, "inventoryItemId"),
    locationId: field(data, "locationId") || null,
    costMethod: field(data, "costMethod") as
      | "FIFO"
      | "WEIGHTED_AVERAGE"
      | "STANDARD"
      | "SPECIFIC_IDENTIFICATION",
    standardUnitCost: field(data, "standardUnitCost")
      ? Number(field(data, "standardUnitCost"))
      : null,
    currencyCode: field(data, "currencyCode") || "USD",
  });

  revalidatePath("/app/inventory-financial-valuation");
}

export async function createCostLayerFromMovementAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await createCostLayerFromMovement({
    movementId: field(data, "movementId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/inventory-financial-valuation");
}

export async function refreshInventoryFinancialValuationAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await refreshInventoryFinancialValuation({
    tenantId: user.tenantId,
    inventoryItemId: field(data, "inventoryItemId"),
    locationId: field(data, "locationId"),
  });

  revalidatePath("/app/inventory-financial-valuation");
}

export async function createInventoryFinancialReconciliationAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await createInventoryFinancialReconciliation({
    tenantId: user.tenantId,
    inventoryItemId: field(data, "inventoryItemId"),
    locationId: field(data, "locationId"),
    expectedValue: Number(field(data, "expectedValue")),
    reason: field(data, "reason") || null,
  });

  revalidatePath("/app/inventory-financial-valuation");
}

export async function approveInventoryFinancialReconciliationAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  await approveInventoryFinancialReconciliation({
    reconciliationId: field(data, "reconciliationId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/inventory-financial-valuation");
}
