"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "TENANT_ADMIN",
  "TENANT_OWNER",
] as const;

export async function createAssetAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const count = await prisma.procurementAsset.count({
    where: { tenantId: user.tenantId },
  });

  await prisma.procurementAsset.create({
    data: {
      tenantId: user.tenantId,
      assetNumber: `AST-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`,
      name: field(data, "name"),
      description: field(data, "description") || null,
      category: field(data, "category"),
      criticality: field(data, "criticality") as
        | "LOW"
        | "MODERATE"
        | "HIGH"
        | "CRITICAL",
      serialNumber: field(data, "serialNumber") || null,
      manufacturer: field(data, "manufacturer") || null,
      modelNumber: field(data, "modelNumber") || null,
      purchaseOrderId: field(data, "purchaseOrderId") || null,
      supplierId: field(data, "supplierId") || null,
      inventoryItemId: field(data, "inventoryItemId") || null,
      siteId: field(data, "siteId") || null,
      location: field(data, "location") || null,
      acquisitionDate: field(data, "acquisitionDate")
        ? new Date(field(data, "acquisitionDate"))
        : null,
      inServiceDate: field(data, "inServiceDate")
        ? new Date(field(data, "inServiceDate"))
        : null,
      purchaseCost: field(data, "purchaseCost")
        ? Number(field(data, "purchaseCost"))
        : null,
      currencyCode: field(data, "currencyCode") || "USD",
      usefulLifeMonths: field(data, "usefulLifeMonths")
        ? Number(field(data, "usefulLifeMonths"))
        : null,
      residualValue: field(data, "residualValue")
        ? Number(field(data, "residualValue"))
        : null,
      warrantyStartsAt: field(data, "warrantyStartsAt")
        ? new Date(field(data, "warrantyStartsAt"))
        : null,
      warrantyEndsAt: field(data, "warrantyEndsAt")
        ? new Date(field(data, "warrantyEndsAt"))
        : null,
      warrantyProvider: field(data, "warrantyProvider") || null,
      ownerUserId: user.id,
      status: field(data, "inServiceDate") ? "IN_SERVICE" : "PLANNED",
    },
  });

  revalidatePath("/app/assets");
}

export async function assignAssetAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const procurementAssetId = field(data, "procurementAssetId");

  const asset = await prisma.procurementAsset.findFirstOrThrow({
    where: { id: procurementAssetId, tenantId: user.tenantId },
  });

  await prisma.$transaction([
    prisma.assetAssignment.updateMany({
      where: { procurementAssetId, status: "ACTIVE" },
      data: { status: "TRANSFERRED", returnedAt: new Date() },
    }),
    prisma.assetAssignment.create({
      data: {
        procurementAssetId,
        assignedToUserId: field(data, "assignedToUserId"),
        assignedByUserId: user.id,
        expectedReturnAt: field(data, "expectedReturnAt")
          ? new Date(field(data, "expectedReturnAt"))
          : null,
        location: field(data, "location") || asset.location,
        conditionAtIssue: field(data, "conditionAtIssue") || null,
        notes: field(data, "notes") || null,
      },
    }),
    prisma.procurementAsset.update({
      where: { id: asset.id },
      data: {
        custodianUserId: field(data, "assignedToUserId"),
        location: field(data, "location") || asset.location,
      },
    }),
  ]);

  revalidatePath("/app/assets");
}

export async function createMaintenancePlanAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const procurementAssetId = field(data, "procurementAssetId");

  await prisma.procurementAsset.findFirstOrThrow({
    where: { id: procurementAssetId, tenantId: user.tenantId },
  });

  await prisma.assetMaintenancePlan.create({
    data: {
      procurementAssetId,
      name: field(data, "name"),
      type: field(data, "type") as
        | "PREVENTIVE"
        | "CORRECTIVE"
        | "INSPECTION"
        | "CALIBRATION"
        | "WARRANTY"
        | "UPGRADE",
      frequencyDays: Number(field(data, "frequencyDays")),
      nextDueAt: new Date(field(data, "nextDueAt")),
      responsibleUserId: field(data, "responsibleUserId") || user.id,
      instructions: field(data, "instructions") || null,
    },
  });

  revalidatePath("/app/assets");
}

export async function createMaintenanceRecordAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const procurementAssetId = field(data, "procurementAssetId");

  await prisma.procurementAsset.findFirstOrThrow({
    where: { id: procurementAssetId, tenantId: user.tenantId },
  });

  await prisma.assetMaintenanceRecord.create({
    data: {
      procurementAssetId,
      maintenancePlanId: field(data, "maintenancePlanId") || null,
      type: field(data, "type") as
        | "PREVENTIVE"
        | "CORRECTIVE"
        | "INSPECTION"
        | "CALIBRATION"
        | "WARRANTY"
        | "UPGRADE",
      status: "COMPLETED",
      scheduledAt: new Date(field(data, "scheduledAt")),
      startedAt: field(data, "startedAt")
        ? new Date(field(data, "startedAt"))
        : null,
      completedAt: new Date(),
      performedBy: field(data, "performedBy") || null,
      vendorName: field(data, "vendorName") || null,
      cost: field(data, "cost") ? Number(field(data, "cost")) : null,
      currencyCode: field(data, "currencyCode") || "USD",
      findings: field(data, "findings") || null,
      workPerformed: field(data, "workPerformed") || null,
      partsUsed: field(data, "partsUsed") || null,
      downtimeHours: field(data, "downtimeHours")
        ? Number(field(data, "downtimeHours"))
        : null,
      evidenceUrl: field(data, "evidenceUrl") || null,
      approvedByUserId: user.id,
    },
  });

  revalidatePath("/app/assets");
}

export async function retireAssetAction(data: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_MANAGER",
    "FINANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const id = field(data, "assetId");
  const asset = await prisma.procurementAsset.findFirstOrThrow({
    where: { id, tenantId: user.tenantId },
  });

  await prisma.procurementAsset.update({
    where: { id: asset.id },
    data: {
      status: field(data, "status") as "RETIRED" | "DISPOSED" | "LOST",
      retiredAt: new Date(),
      retirementReason: field(data, "retirementReason"),
      custodianUserId: null,
    },
  });

  revalidatePath("/app/assets");
}
