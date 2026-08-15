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

export async function createMarketplaceShipmentAction(
  formData: FormData,
) {
  const user = await requireAnyRole([
    "SUPPLIER_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const marketplaceOrderId = field(
    formData,
    "marketplaceOrderId",
  );

  const order = await prisma.marketplaceSellerOrder.findFirstOrThrow({
    where: {
      id: marketplaceOrderId,
      sellerTenantId: user.tenantId,
      status: "ACCEPTED",
      purchaseOrderExecutionId: { not: null },
    },
  });

  if (!order.purchaseOrderExecutionId) {
    throw new Error(
      "This marketplace order is not linked to a governed purchase order.",
    );
  }

  const existing = await prisma.logisticsShipment.findFirst({
    where: {
      tenantId: user.tenantId,
      purchaseOrderId: order.purchaseOrderExecutionId,
    },
  });

  if (existing) {
    throw new Error(
      `Shipment ${existing.shipmentNumber} is already configured for this marketplace order.`,
    );
  }

  const carrierId = field(formData, "carrierId");
  const trackingNumber = field(formData, "trackingNumber");
  const freightCostValue = field(formData, "freightCost");

  if (!carrierId) {
    throw new Error("Select a carrier before saving the shipment.");
  }

  if (!trackingNumber) {
    throw new Error(
      "A tracking number is required for marketplace shipments.",
    );
  }

  if (
    !freightCostValue ||
    !Number.isFinite(Number(freightCostValue)) ||
    Number(freightCostValue) < 0
  ) {
    throw new Error(
      "Enter a valid freight / shipping cost.",
    );
  }

  const carrier = await prisma.logisticsCarrier.findFirstOrThrow({
    where: {
      id: carrierId,
      tenantId: user.tenantId,
      active: true,
    },
  });

  const count = await prisma.logisticsShipment.count({
    where: { tenantId: user.tenantId },
  });

  const shipment = await prisma.logisticsShipment.create({
    data: {
      tenantId: user.tenantId,
      shipmentNumber:
        `SHIP-${new Date().getFullYear()}-${String(
          count + 1,
        ).padStart(6, "0")}`,
      purchaseOrderId: order.purchaseOrderExecutionId,
      supplierId: null,
      carrierId: carrier.id,
      mode: field(formData, "mode") as
        | "ROAD"
        | "AIR"
        | "OCEAN"
        | "RAIL"
        | "COURIER"
        | "MULTIMODAL",
      status: "BOOKED",
      origin: field(formData, "origin"),
      destination: field(formData, "destination"),
      trackingNumber,
      incoterm: field(formData, "incoterm") || null,
      bookedAt: new Date(),
      pickupAt: field(formData, "pickupAt")
        ? new Date(field(formData, "pickupAt"))
        : null,
      estimatedDeliveryAt: field(
        formData,
        "estimatedDeliveryAt",
      )
        ? new Date(
            field(formData, "estimatedDeliveryAt"),
          )
        : null,
      freightCost: Number(freightCostValue),
      currencyCode:
        field(formData, "currencyCode") ||
        order.currencyCode,
      weight: field(formData, "weight")
        ? Number(field(formData, "weight"))
        : null,
      weightUnit:
        field(formData, "weightUnit") || null,
      packageCount: Number(
        field(formData, "packageCount") || 0,
      ),
      delayRiskPercent: Number(
        field(formData, "delayRiskPercent") || 0,
      ),
      ownerUserId: user.id,
    },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email,
      action:
        "marketplace.logistics.shipment_configured",
      resourceType: "MarketplaceSellerOrder",
      resourceId: order.id,
      after: {
        shipmentId: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        purchaseOrderExecutionId:
          order.purchaseOrderExecutionId,
        carrierId: carrier.id,
        carrierName: carrier.name,
        trackingNumber,
        freightCost: Number(freightCostValue),
        currencyCode: shipment.currencyCode,
      },
    },
  });

  revalidatePath("/app/logistics");
  revalidatePath("/app/marketplace/orders");
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
