"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { createNativeInventoryRebalancingDraft } from "@/core/autonomous-procurement/native-inventory-rebalancing-adapter";
import { prisma } from "@/lib/prisma";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function createNativeInventoryRebalancingDraftAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  const movement =
    await createNativeInventoryRebalancingDraft({
      tenantId: user.tenantId,
      userId: user.id,
      nativeDraftId: field(data, "nativeDraftId"),
    });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Autonomous inventory operator",
      action:
        "autonomous_execution.native_inventory.create_transfer_draft",
      resourceType: "InventoryMovementLedger",
      resourceId: movement.id,
      after: {
        movementNumber: movement.movementNumber,
        movementType: movement.movementType,
        status: movement.status,
        inventoryItemId: movement.inventoryItemId,
        quantity: Number(movement.quantity),
        autonomousPostingPerformed: false,
        inventoryQuantityChanged: false,
      },
    },
  });

  revalidatePath(
    "/app/governance/autonomous-execution/native-drafts/inventory",
  );
  revalidatePath("/app/inventory-operations");
}
