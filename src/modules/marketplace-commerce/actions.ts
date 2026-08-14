"use server";

import { revalidatePath } from "next/cache";
import {
  PurchaseRequestPriority,
  PurchaseRequestStatus,
} from "@/generated/prisma/enums";
import {
  hasResourceScope,
  requireAnyRole,
} from "@/core/auth/authorization";
import { createAndDeliverEnterpriseNotification } from "@/core/notifications";
import { prisma } from "@/lib/prisma";
import type { MarketplaceCheckoutInput } from "@/core/marketplace-commerce/types";
import {
  notifyBuyerWarehouseTeam,
  notifyUser,
} from "@/core/marketplace-commerce/notifications";
import {
  acknowledgePurchaseOrderExecution,
  raiseRequisitionOrderException,
} from "@/core/requisition-to-order";

async function requireBuyerPersona() {
  const user = await requireAnyRole([
    "REQUESTER",
    "BUYER",
    "PROCUREMENT_MANAGER",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: user.tenantId },
    select: { commercialPersona: true },
  });
  if (tenant.commercialPersona === "SUPPLIER") {
    throw new Error("Supplier-only tenants cannot submit marketplace purchase requests.");
  }
  return user;
}

async function buildApprovalChain(
  tenantId: string,
  requesterId: string,
  amountUsd: number,
  preferredApproverId?: string,
) {
  const approvers = await prisma.membership.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      roles: { has: "APPROVER" },
      userId: { not: requesterId },
      approvalLimitUsd: { not: null },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { approvalLimitUsd: "asc" },
  });

  if (preferredApproverId) {
    const selected = approvers.find(
      (membership) => membership.userId === preferredApproverId,
    );

    if (!selected) {
      throw new Error(
        "The selected approver is not an active Purchase Request approver for this tenant.",
      );
    }

    return [selected];
  }

  const eligible = approvers.filter(
    (membership) =>
      Number(membership.approvalLimitUsd) >= amountUsd,
  );

  return eligible.length ? [eligible[0]] : [];
}

export async function submitMarketplaceCartAction(
  input: MarketplaceCheckoutInput,
) {
  const user = await requireBuyerPersona();

  if (input.title.trim().length < 3) throw new Error("Purchase request title is required.");
  if (input.businessJustification.trim().length < 10) {
    throw new Error("Business justification must contain at least 10 characters.");
  }
  if (!input.items.length || input.items.length > 100) {
    throw new Error("Marketplace cart must contain between 1 and 100 items.");
  }
  if (!Number.isFinite(input.exchangeRateToUsd) || input.exchangeRateToUsd <= 0) {
    throw new Error("A valid exchange rate is required.");
  }

  if (!hasResourceScope(user.legalEntityScopeIds, input.legalEntityId || null)) {
    throw new Error("The selected legal entity is outside your assigned scope.");
  }
  if (!hasResourceScope(user.siteScopeIds, input.siteId || null)) {
    throw new Error("The selected site is outside your assigned scope.");
  }
  if (!hasResourceScope(user.departmentScopeIds, input.departmentId || null)) {
    throw new Error("The selected department is outside your assigned scope.");
  }

  const requestedIds = Array.from(new Set(input.items.map((item) => item.offeringId)));
  const offerings = await prisma.supplierMarketplaceOffering.findMany({
    where: { id: { in: requestedIds }, marketplaceVisible: true },
  });

  if (offerings.length !== requestedIds.length) {
    throw new Error("One or more marketplace offerings are no longer available.");
  }

  const supplierIds = Array.from(
    new Set(offerings.map((offering) => offering.supplierId)),
  );

  const [suppliers, media] = await Promise.all([
    prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: {
        id: true,
        legalName: true,
        tradingName: true,
      },
    }),
    prisma.supplierMarketplaceOfferingMedia.findMany({
      where: { offeringId: { in: requestedIds } },
      orderBy: [
        { isPrimary: "desc" },
        { position: "asc" },
        { createdAt: "asc" },
      ],
    }),
  ]);

  const supplierMap = new Map(
    suppliers.map((supplier) => [supplier.id, supplier]),
  );

  const mediaByOffering = new Map<
    string,
    typeof media
  >();

  for (const item of media) {
    const current = mediaByOffering.get(item.offeringId) ?? [];
    current.push(item);
    mediaByOffering.set(item.offeringId, current);
  }

  const offeringMap = new Map(offerings.map((item) => [item.id, item]));
  const trustedLines = input.items.map((cartItem) => {
    const offering = offeringMap.get(cartItem.offeringId);
    if (!offering) throw new Error("Marketplace offering is unavailable.");
    if (offering.unitPrice == null) {
      throw new Error(`${offering.name} requires a supplier quote and cannot be checked out directly.`);
    }

    const quantity = Number(cartItem.quantity);
    const minimum = offering.minimumOrderQty == null ? 0 : Number(offering.minimumOrderQty);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Enter a valid quantity for ${offering.name}.`);
    }
    if (minimum > 0 && quantity < minimum) {
      throw new Error(`${offering.name} has a minimum order quantity of ${minimum}.`);
    }

    const supplier = supplierMap.get(offering.supplierId);
    if (!supplier) {
      throw new Error(
        `Supplier record for ${offering.name} is unavailable.`,
      );
    }

    const offeringMedia =
      mediaByOffering.get(offering.id) ?? [];

    return {
      offering,
      quantity,
      unitPrice: Number(offering.unitPrice),
      unitOfMeasure: offering.unitOfMeasure || "EA",
      supplierName:
        supplier.tradingName ?? supplier.legalName,
      primaryImage:
        offeringMedia[0]?.pathname ??
        offering.imageRef ??
        null,
    };
  });

  const currencies = new Set(trustedLines.map((line) => line.offering.currencyCode));
  if (currencies.size !== 1) {
    throw new Error("Submit separate marketplace Purchase Requests by currency.");
  }

  const originalCurrency = trustedLines[0].offering.currencyCode;
  const totalAmount = trustedLines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );
  const usdEquivalent = totalAmount * input.exchangeRateToUsd;
  const approvalChain = await buildApprovalChain(
    user.tenantId,
    user.id,
    usdEquivalent,
    input.preferredApproverId,
  );

  const status = approvalChain.length
    ? PurchaseRequestStatus.SUBMITTED
    : PurchaseRequestStatus.UNDER_REVIEW;

  const count = await prisma.purchaseRequest.count({
    where: { tenantId: user.tenantId },
  });
  const requestNumber = `PR-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;

  const request = await prisma.$transaction(async (tx) => {
    const saved = await tx.purchaseRequest.create({
      data: {
        tenantId: user.tenantId,
        requesterId: user.id,
        legalEntityId: input.legalEntityId || null,
        siteId: input.siteId || null,
        departmentId: input.departmentId || null,
        requestNumber,
        title: input.title.trim(),
        businessJustification: input.businessJustification.trim(),
        priority: input.priority as PurchaseRequestPriority,
        neededByDate: input.neededByDate ? new Date(input.neededByDate) : null,
        originalCurrency,
        totalAmount,
        usdEquivalent,
        exchangeRateToUsd: input.exchangeRateToUsd,
        exchangeRateSource: input.exchangeRateSource.trim(),
        exchangeRateDate: new Date(),
        status,
        submittedAt: new Date(),
        lines: {
          create: trustedLines.map((line, index) => ({
            lineNumber: index + 1,
            description: line.offering.name,
            category: line.offering.category || null,
            quantity: line.quantity,
            unitOfMeasure: line.unitOfMeasure,
            unitPrice: line.unitPrice,
            lineTotal: line.quantity * line.unitPrice,
            supplierSuggestion: line.supplierName,
          })),
        },
        approvals: approvalChain.length
          ? {
              create: approvalChain.map((approver, index) => ({
                approverId: approver.userId,
                sequence: index + 1,
              })),
            }
          : undefined,
      },
    });

    const createdLines = await tx.purchaseRequestLine.findMany({
      where: { purchaseRequestId: saved.id },
      orderBy: { lineNumber: "asc" },
    });

    for (let index = 0; index < createdLines.length; index += 1) {
      const line = trustedLines[index];
      await tx.marketplacePurchaseRequestLineBinding.create({
        data: {
          tenantId: user.tenantId,
          purchaseRequestId: saved.id,
          purchaseRequestLineId: createdLines[index].id,
          marketplaceOfferingId: line.offering.id,
          sellerTenantId: line.offering.tenantId,
          sellerSupplierId: line.offering.supplierId,
          offeringName: line.offering.name,
          sku: line.offering.sku,
          imageRef: line.primaryImage,
          currencyCode: line.offering.currencyCode,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          unitOfMeasure: line.unitOfMeasure,
          leadTimeDays: line.offering.leadTimeDays,
        },
      });
    }

    await tx.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: "marketplace.purchase_request.submit",
        resourceType: "PurchaseRequest",
        resourceId: saved.id,
        after: {
          status,
          requestNumber,
          totalAmount,
          marketplaceLineCount: trustedLines.length,
          selectedApproverId: approvalChain[0]?.userId ?? null,
          selectedApproverEmail: approvalChain[0]?.user.email ?? null,
          selectedApproverLimitUsd:
            approvalChain[0]?.approvalLimitUsd == null
              ? null
              : Number(approvalChain[0].approvalLimitUsd),
          requiredAmountUsd: usdEquivalent,
          requiresApprovalEscalation:
            approvalChain[0]?.approvalLimitUsd == null
              ? true
              : Number(approvalChain[0].approvalLimitUsd) < usdEquivalent,
        },
      },
    });

    return saved;
  });

  const firstApprover = approvalChain[0];
  if (firstApprover) {
    await createAndDeliverEnterpriseNotification({
      tenantId: user.tenantId,
      eventType: "MarketplacePurchaseRequest.ApprovalRequired",
      recipientUserId: firstApprover.user.id,
      recipientAddress: firstApprover.user.email ?? undefined,
      title: "Marketplace purchase request approval required",
      message: `${requestNumber} for ${originalCurrency} ${totalAmount.toLocaleString()} is awaiting your approval.`,
      actionUrl: `/app/requests/${request.id}`,
      channels: firstApprover.user.email ? ["IN_APP", "EMAIL"] : ["IN_APP"],
      priority: "HIGH",
    });
  }

  await notifyUser({
    tenantId: user.tenantId,
    userId: user.id,
    eventType: "MarketplacePurchaseRequest.Submitted",
    title: "Marketplace purchase request submitted",
    message: `${requestNumber} was submitted with ${trustedLines.length} marketplace item${trustedLines.length === 1 ? "" : "s"}.`,
    actionUrl: `/app/requests/${request.id}`,
    priority: "NORMAL",
  });

  revalidatePath("/app/requests");
  return { purchaseRequestId: request.id, requestNumber };
}

function field(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

async function getOwnedSellerOrder(orderId: string) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "SUPPLIER_MANAGER",
  ]);
  const order = await prisma.marketplaceSellerOrder.findFirstOrThrow({
    where: { id: orderId, sellerTenantId: user.tenantId },
  });
  return { user, order };
}

export async function acceptMarketplaceSellerOrderAction(data: FormData) {
  const { user, order } = await getOwnedSellerOrder(field(data, "orderId"));
  if (order.status !== "PLACED") throw new Error("Only placed orders can be accepted.");

  await prisma.marketplaceSellerOrder.update({
    where: { id: order.id },
    data: { status: "ACCEPTED", acceptedByUserId: user.id, acceptedAt: new Date() },
  });

  if (order.purchaseOrderExecutionId) {
    await acknowledgePurchaseOrderExecution({
      executionId: order.purchaseOrderExecutionId,
      actorUserId: user.id,
    });
  }

  if (order.buyerRequesterUserId) {
    await notifyUser({
      tenantId: order.buyerTenantId,
      userId: order.buyerRequesterUserId,
      eventType: "MarketplaceOrder.Accepted",
      title: "Supplier accepted purchase order",
      message: `${order.orderNumber ?? "Your marketplace order"} was accepted by the supplier.`,
      actionUrl: `/app/requests/${order.purchaseRequestId}`,
    });
  }

  await notifyBuyerWarehouseTeam({
    buyerTenantId: order.buyerTenantId,
    eventType: "MarketplaceOrder.ReadyForReceiving",
    title: "Supplier order accepted — prepare receiving",
    message:
      `${order.orderNumber ?? "Marketplace order"} was accepted by the supplier. The ordered product lines are now available in Warehouse Operations for receiving preparation.`,
    actionUrl: "/app/warehouse-operations",
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: order.buyerTenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email,
      action: "marketplace.order.accepted_for_receiving",
      resourceType: "MarketplaceSellerOrder",
      resourceId: order.id,
      after: {
        orderNumber: order.orderNumber,
        purchaseRequestId: order.purchaseRequestId,
        purchaseOrderExecutionId:
          order.purchaseOrderExecutionId,
        sellerTenantId: order.sellerTenantId,
        status: "ACCEPTED",
        warehouseRoute: "/app/warehouse-operations",
      },
    },
  });
  revalidatePath("/app/marketplace/orders");
}

export async function rejectMarketplaceSellerOrderAction(data: FormData) {
  const { user, order } = await getOwnedSellerOrder(field(data, "orderId"));
  const reason = field(data, "reason") || "Supplier rejected the marketplace order.";

  if (!["PLACED", "ACCEPTED"].includes(order.status)) {
    throw new Error("This marketplace order cannot be rejected in its current state.");
  }

  await prisma.marketplaceSellerOrder.update({
    where: { id: order.id },
    data: {
      status: "REJECTED",
      rejectedByUserId: user.id,
      rejectedAt: new Date(),
      rejectionReason: reason,
    },
  });

  if (order.journeyId) {
    await raiseRequisitionOrderException({
      journeyId: order.journeyId,
      code: "SUPPLIER_REJECTED_ORDER",
      title: "Supplier rejected marketplace order",
      description: reason,
      severity: "HIGH",
      actorUserId: user.id,
    });
  }

  if (order.buyerRequesterUserId) {
    await notifyUser({
      tenantId: order.buyerTenantId,
      userId: order.buyerRequesterUserId,
      eventType: "MarketplaceOrder.RejectedBySupplier",
      title: "Supplier rejected purchase order",
      message: `${order.orderNumber ?? "Your marketplace order"} was rejected by the supplier: ${reason}`,
      actionUrl: `/app/requests/${order.purchaseRequestId}`,
      priority: "HIGH",
    });
  }
  revalidatePath("/app/marketplace/orders");
}

export async function shipMarketplaceSellerOrderAction(data: FormData) {
  const { user, order } = await getOwnedSellerOrder(field(data, "orderId"));
  if (order.status !== "ACCEPTED") {
    throw new Error("The supplier must accept the order before recording shipment.");
  }

  const carrier = field(data, "carrier");
  const trackingNumber = field(data, "trackingNumber");
  const expectedDeliveryAt = field(data, "expectedDeliveryAt");
  if (!carrier || !trackingNumber) throw new Error("Carrier and tracking number are required.");

  await prisma.marketplaceSellerOrder.update({
    where: { id: order.id },
    data: {
      status: "SHIPPED",
      carrier,
      trackingNumber,
      expectedDeliveryAt: expectedDeliveryAt ? new Date(expectedDeliveryAt) : null,
      shippedByUserId: user.id,
      shippedAt: new Date(),
    },
  });

  if (order.buyerRequesterUserId) {
    await notifyUser({
      tenantId: order.buyerTenantId,
      userId: order.buyerRequesterUserId,
      eventType: "MarketplaceOrder.Shipped",
      title: "Marketplace order shipped",
      message: `${order.orderNumber ?? "Your order"} shipped via ${carrier}. Tracking: ${trackingNumber}.`,
      actionUrl: "/app/requisition-to-order/receipts",
      priority: "HIGH",
    });
  }

  await notifyBuyerWarehouseTeam({
    buyerTenantId: order.buyerTenantId,
    eventType: "MarketplaceOrder.InboundShipment",
    title: "Marketplace shipment inbound",
    message:
      `${order.orderNumber ?? "Marketplace order"} shipped via ${carrier}. Tracking: ${trackingNumber}. Receive the accepted product lines in Warehouse Operations when physically delivered.`,
    actionUrl: "/app/warehouse-operations",
  });
  revalidatePath("/app/marketplace/orders");
}
