"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import {
  createGoodsReceiptSession,
  postGoodsReceiptSession,
  resolveGoodsReceiptException,
} from "@/core/requisition-to-order/goods-receipt";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "ACCOUNTS_PAYABLE",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
] as const;

export async function createGoodsReceiptSessionAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  const purchaseOrderExecutionId = field(
    data,
    "purchaseOrderExecutionId",
  );
  const lineReference = field(data, "lineReference");
  const description = field(data, "description");
  const orderedQuantity = Number(field(data, "orderedQuantity"));
  const previouslyReceived = Number(
    field(data, "previouslyReceived") || 0,
  );
  const receivedQuantity = Number(field(data, "receivedQuantity"));
  const condition = field(data, "condition");

  const fail = (message: string): never => {
    redirect(
      `/app/requisition-to-order/receipts?error=${encodeURIComponent(message)}`,
    );
  };

  if (!purchaseOrderExecutionId) {
    fail("Select a purchase order before creating a receipt.");
  }

  if (!lineReference || !description) {
    fail("Line reference and description are required.");
  }

  if (!Number.isFinite(orderedQuantity) || orderedQuantity <= 0) {
    fail("Ordered quantity must be greater than zero.");
  }

  if (!Number.isFinite(previouslyReceived) || previouslyReceived < 0) {
    fail("Previously received quantity cannot be negative.");
  }

  if (!Number.isFinite(receivedQuantity) || receivedQuantity < 0) {
    fail("Received quantity must be zero or greater.");
  }

  if (
    !["ACCEPTED", "DAMAGED", "REJECTED", "QUARANTINED"].includes(
      condition,
    )
  ) {
    fail("Select a valid receipt condition.");
  }

  const execution =
    await prisma.purchaseOrderExecution.findFirst({
      where: {
        id: purchaseOrderExecutionId,
        tenantId: user.tenantId,
        status: {
          in: [
            "ISSUED",
            "ACKNOWLEDGED",
            "PARTIALLY_RECEIVED",
          ],
        },
      },
      select: {
        id: true,
      },
    });

  if (!execution) {
    fail(
      "The selected purchase order is no longer available for receiving.",
    );
  }

  try {
    await createGoodsReceiptSession({
      purchaseOrderExecutionId,
      receivedByUserId: user.id,
      deliveryReference:
        field(data, "deliveryReference") || null,
      carrierReference:
        field(data, "carrierReference") || null,
      locationReference:
        field(data, "locationReference") || null,
      notes: field(data, "notes") || null,
      line: {
        lineReference,
        description,
        orderedQuantity,
        previouslyReceived,
        receivedQuantity,
        unitOfMeasure:
          field(data, "unitOfMeasure") || "EA",
        condition: condition as
          | "ACCEPTED"
          | "DAMAGED"
          | "REJECTED"
          | "QUARANTINED",
        serialOrLotReference:
          field(data, "serialOrLotReference") || null,
      },
    });
  } catch (error) {
    console.error("Goods receipt creation failed", {
      tenantId: user.tenantId,
      userId: user.id,
      purchaseOrderExecutionId,
      error,
    });

    fail(
      "The receipt could not be created. Verify the purchase order and quantities, then try again.",
    );
  }

  revalidatePath("/app/requisition-to-order/receipts");
  redirect("/app/requisition-to-order/receipts?created=1");
}

export async function postGoodsReceiptSessionAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await postGoodsReceiptSession({
    receiptSessionId: field(data, "receiptSessionId"),
    actorUserId: user.id,
    overReceiptTolerancePercent: Number(
      field(data, "overReceiptTolerancePercent") || 0,
    ),
    underReceiptTolerancePercent: Number(
      field(data, "underReceiptTolerancePercent") || 0,
    ),
  });

  revalidatePath("/app/requisition-to-order/receipts");
}

export async function resolveGoodsReceiptExceptionAction(data: FormData) {
  const user = await requireAnyRole([...roles]);

  await resolveGoodsReceiptException({
    exceptionId: field(data, "exceptionId"),
    actorUserId: user.id,
    resolution: field(data, "resolution"),
  });

  revalidatePath("/app/requisition-to-order/receipts");
}
