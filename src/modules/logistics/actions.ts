"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const roles = [
  "PROCUREMENT_MANAGER",
  "BUYER",
  "SUPPLIER_MANAGER",
  "TENANT_ADMIN",
  "TENANT_OWNER",
] as const;

export async function createCarrierAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);

  await prisma.logisticsCarrier.create({
    data: {
      tenantId: user.tenantId,
      code: field(formData, "code"),
      name: field(formData, "name"),
      contactName: field(formData, "contactName") || null,
      contactEmail: field(formData, "contactEmail") || null,
      contactPhone: field(formData, "contactPhone") || null,
      scacCode: field(formData, "scacCode") || null,
    },
  });

  revalidatePath("/app/logistics");
}

export async function createShipmentAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const count = await prisma.logisticsShipment.count({
    where: { tenantId: user.tenantId },
  });

  await prisma.logisticsShipment.create({
    data: {
      tenantId: user.tenantId,
      shipmentNumber: `SHIP-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`,
      purchaseOrderId: field(formData, "purchaseOrderId") || null,
      supplierId: field(formData, "supplierId") || null,
      carrierId: field(formData, "carrierId") || null,
      mode: field(formData, "mode") as
        | "ROAD"
        | "AIR"
        | "OCEAN"
        | "RAIL"
        | "COURIER"
        | "MULTIMODAL",
      origin: field(formData, "origin"),
      destination: field(formData, "destination"),
      trackingNumber: field(formData, "trackingNumber") || null,
      incoterm: field(formData, "incoterm") || null,
      pickupAt: field(formData, "pickupAt")
        ? new Date(field(formData, "pickupAt"))
        : null,
      estimatedDeliveryAt: field(formData, "estimatedDeliveryAt")
        ? new Date(field(formData, "estimatedDeliveryAt"))
        : null,
      freightCost: field(formData, "freightCost")
        ? Number(field(formData, "freightCost"))
        : null,
      currencyCode: field(formData, "currencyCode") || "USD",
      weight: field(formData, "weight")
        ? Number(field(formData, "weight"))
        : null,
      weightUnit: field(formData, "weightUnit") || null,
      packageCount: Number(field(formData, "packageCount") || 0),
      delayRiskPercent: Number(field(formData, "delayRiskPercent") || 0),
      ownerUserId: user.id,
    },
  });

  revalidatePath("/app/logistics");
}

export async function addTrackingEventAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const shipmentId = field(formData, "shipmentId");

  const shipment = await prisma.logisticsShipment.findFirstOrThrow({
    where: { id: shipmentId, tenantId: user.tenantId },
  });

  const type = field(formData, "type") as
    | "BOOKED"
    | "PICKED_UP"
    | "DEPARTED"
    | "ARRIVED"
    | "CUSTOMS_HOLD"
    | "DELAYED"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "EXCEPTION";

  const status =
    type === "DELIVERED"
      ? "DELIVERED"
      : type === "DELAYED" || type === "CUSTOMS_HOLD" || type === "EXCEPTION"
        ? "DELAYED"
        : ["PICKED_UP", "DEPARTED", "ARRIVED", "OUT_FOR_DELIVERY"].includes(type)
          ? "IN_TRANSIT"
          : shipment.status;

  await prisma.$transaction([
    prisma.logisticsTrackingEvent.create({
      data: {
        shipmentId,
        type,
        occurredAt: new Date(field(formData, "occurredAt")),
        location: field(formData, "location") || null,
        description: field(formData, "description"),
        source: field(formData, "source") || null,
        evidenceUrl: field(formData, "evidenceUrl") || null,
      },
    }),
    prisma.logisticsShipment.update({
      where: { id: shipment.id },
      data: {
        status,
        actualDeliveryAt:
          type === "DELIVERED"
            ? new Date(field(formData, "occurredAt"))
            : shipment.actualDeliveryAt,
        exceptionSummary:
          status === "DELAYED"
            ? field(formData, "description")
            : shipment.exceptionSummary,
      },
    }),
  ]);

  revalidatePath("/app/logistics");
}

export async function updateProofOfDeliveryAction(formData: FormData) {
  const user = await requireAnyRole([...roles]);
  const shipmentId = field(formData, "shipmentId");

  const shipment = await prisma.logisticsShipment.findFirstOrThrow({
    where: { id: shipmentId, tenantId: user.tenantId },
  });

  await prisma.logisticsShipment.update({
    where: { id: shipment.id },
    data: {
      proofOfDeliveryUrl: field(formData, "proofOfDeliveryUrl"),
    },
  });

  revalidatePath("/app/logistics");
}
