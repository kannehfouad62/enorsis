import "server-only";

import {
  createPurchaseOrderExecution,
  createRequisitionOrderJourney,
  issuePurchaseOrderExecution,
  transitionRequisitionOrderJourney,
  validatePurchaseOrderExecution,
} from "@/core/requisition-to-order";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import { ensureBuyerMarketplaceSupplierProjection } from "./buyer-supplier-projection";
import { notifySellerTenant, notifyUser } from "./notifications";

async function ensureApprovalEvidence(input: {
  journeyId: string;
  purchaseRequestId: string;
  approverUserId: string;
  amount: number;
  currencyCode: string;
}) {
  const existing = await prisma.requisitionApprovalRoute.findFirst({
    where: { journeyId: input.journeyId, status: "APPROVED" },
    select: { id: true },
  });
  if (existing) return existing;

  const journey = await prisma.requisitionOrderJourney.findUniqueOrThrow({
    where: { id: input.journeyId },
  });

  const route = await prisma.requisitionApprovalRoute.create({
    data: {
      tenantId: journey.tenantId,
      journeyId: journey.id,
      name: "Canonical purchase request approval evidence",
      status: "APPROVED",
      amount: input.amount,
      currencyCode: input.currencyCode,
      initiatedByUserId: input.approverUserId,
      initiatedAt: new Date(),
      completedAt: new Date(),
      correlationId: journey.correlationId,
      steps: {
        create: {
          sequence: 1,
          name: "Marketplace purchase request approved",
          mode: "SEQUENTIAL",
          requiredApprovals: 1,
          completedAt: new Date(),
          decisions: {
            create: {
              approverUserId: input.approverUserId,
              status: "APPROVED",
              comments: `Approval mirrored from canonical PurchaseRequest ${input.purchaseRequestId}.`,
              decidedAt: new Date(),
            },
          },
        },
      },
    },
    select: { id: true },
  });

  await transitionRequisitionOrderJourney({
    journeyId: journey.id,
    status: "APPROVED",
    actorUserId: input.approverUserId,
    description:
      "Canonical marketplace Purchase Request approval was bound to this supplier order journey.",
  });

  return route;
}

export async function orchestrateApprovedMarketplacePurchaseRequest(input: {
  purchaseRequestId: string;
  actorUserId: string;
}) {
  const request = await prisma.purchaseRequest.findUnique({
    where: { id: input.purchaseRequestId },
  });

  if (!request || request.status !== "APPROVED") return [];

  const bindings =
    await prisma.marketplacePurchaseRequestLineBinding.findMany({
      where: {
        tenantId: request.tenantId,
        purchaseRequestId: request.id,
      },
      orderBy: { createdAt: "asc" },
    });

  if (!bindings.length) return [];

  const buyerTenant = await prisma.tenant.findUnique({
    where: { id: request.tenantId },
    select: { name: true },
  });

  const groups = new Map<string, typeof bindings>();
  for (const binding of bindings) {
    const current = groups.get(binding.sellerTenantId) ?? [];
    current.push(binding);
    groups.set(binding.sellerTenantId, current);
  }

  const results = [];

  for (const [sellerTenantId, group] of groups) {
    const first = group[0];
    const lines = group.map((item) => ({
      offeringId: item.marketplaceOfferingId,
      offeringName: item.offeringName,
      sku: item.sku,
      sellerSupplierId: item.sellerSupplierId,
      sellerTenantId: item.sellerTenantId,
      quantity: Number(item.quantity),
      unitOfMeasure: item.unitOfMeasure,
      unitPrice: Number(item.unitPrice),
      currencyCode: item.currencyCode,
      leadTimeDays: item.leadTimeDays,
      imageRef: item.imageRef,
    }));
    const total = lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0,
    );

    let sellerOrder = await prisma.marketplaceSellerOrder.upsert({
      where: {
        purchaseRequestId_sellerTenantId: {
          purchaseRequestId: request.id,
          sellerTenantId,
        },
      },
      create: {
        buyerTenantId: request.tenantId,
        sellerTenantId,
        purchaseRequestId: request.id,
        sellerSupplierId: first.sellerSupplierId,
        status: "PENDING",
        currencyCode: request.originalCurrency,
        totalAmount: total,
        lineSnapshot: toJson(lines),
        buyerRequesterUserId: request.requesterId,
        buyerTenantName: buyerTenant?.name ?? null,
      },
      update: {},
    });

    if (
      sellerOrder.purchaseOrderExecutionId &&
      ["PLACED", "ACCEPTED", "SHIPPED"].includes(sellerOrder.status)
    ) {
      results.push(sellerOrder);
      continue;
    }

    const claimed = await prisma.marketplaceSellerOrder.updateMany({
      where: {
        id: sellerOrder.id,
        status: { in: ["PENDING", "ORCHESTRATION_FAILED"] },
        purchaseOrderExecutionId: null,
      },
      data: { status: "ORCHESTRATING" },
    });

    if (!claimed.count && sellerOrder.status === "ORCHESTRATING") {
      results.push(sellerOrder);
      continue;
    }

    try {
      const buyerSupplier =
        await ensureBuyerMarketplaceSupplierProjection({
          buyerTenantId: request.tenantId,
          sellerTenantId,
          sellerSupplierId: first.sellerSupplierId,
        });

      let journey = sellerOrder.journeyId
        ? await prisma.requisitionOrderJourney.findUnique({
            where: { id: sellerOrder.journeyId },
          })
        : null;

      if (!journey) {
        journey = await createRequisitionOrderJourney({
          tenantId: request.tenantId,
          title: `${request.requestNumber} · ${buyerSupplier.tradingName ?? buyerSupplier.legalName}`,
          description:
            "Marketplace supplier-specific order journey generated from an approved canonical Purchase Request.",
          requesterUserId: request.requesterId,
          currencyCode: request.originalCurrency,
          estimatedAmount: total,
          requiredByDate: request.neededByDate,
        });

        await prisma.requisitionOrderJourney.update({
          where: { id: journey.id },
          data: {
            purchaseRequestId: request.id,
            supplierId: buyerSupplier.id,
          },
        });

        sellerOrder = await prisma.marketplaceSellerOrder.update({
          where: { id: sellerOrder.id },
          data: {
            journeyId: journey.id,
            buyerSupplierId: buyerSupplier.id,
          },
        });
      }

      await ensureApprovalEvidence({
        journeyId: journey.id,
        purchaseRequestId: request.id,
        approverUserId: input.actorUserId,
        amount: total,
        currencyCode: request.originalCurrency,
      });

      let execution = sellerOrder.purchaseOrderExecutionId
        ? await prisma.purchaseOrderExecution.findUnique({
            where: { id: sellerOrder.purchaseOrderExecutionId },
          })
        : null;

      if (!execution) {
        execution = await createPurchaseOrderExecution({
          journeyId: journey.id,
          supplierId: buyerSupplier.id,
          currencyCode: request.originalCurrency,
          lines: lines.map((line) => ({
            description: line.sku
              ? `${line.offeringName} (${line.sku})`
              : line.offeringName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            unitOfMeasure: line.unitOfMeasure,
          })),
          requestedDeliveryAt: request.neededByDate,
          actorUserId: input.actorUserId,
        });

        await prisma.marketplaceSellerOrder.update({
          where: { id: sellerOrder.id },
          data: {
            purchaseOrderExecutionId: execution.id,
            orderNumber: execution.orderNumber,
          },
        });
      }

      if (execution.status === "DRAFT") {
        execution = await validatePurchaseOrderExecution(execution.id);
      }
      if (execution.status === "READY_TO_ISSUE") {
        await issuePurchaseOrderExecution({
          executionId: execution.id,
          actorUserId: input.actorUserId,
        });
      }

      sellerOrder = await prisma.marketplaceSellerOrder.update({
        where: { id: sellerOrder.id },
        data: {
          status: "PLACED",
          buyerSupplierId: buyerSupplier.id,
          purchaseOrderExecutionId: execution.id,
          orderNumber: execution.orderNumber,
        },
      });

      await notifySellerTenant({
        sellerTenantId,
        eventType: "MarketplaceOrder.Placed",
        title: "New marketplace purchase order",
        message:
          `${buyerTenant?.name ?? "A buyer"} placed ${execution.orderNumber} for ${request.originalCurrency} ${total.toLocaleString()}. Review and accept the order in Marketplace Orders.`,
        actionUrl: "/app/marketplace/orders",
        correlationId: journey.correlationId,
      });

      results.push(sellerOrder);
    } catch (error) {
      await prisma.marketplaceSellerOrder.update({
        where: { id: sellerOrder.id },
        data: { status: "ORCHESTRATION_FAILED" },
      });
      throw error;
    }
  }

  await notifyUser({
    tenantId: request.tenantId,
    userId: request.requesterId,
    eventType: "MarketplacePurchaseRequest.Approved",
    title: "Purchase request approved",
    message:
      `${request.requestNumber} was approved. Enorsis generated and issued ${results.length} supplier purchase order${results.length === 1 ? "" : "s"}.`,
    actionUrl: `/app/requests/${request.id}`,
    priority: "HIGH",
  });

  return results;
}

export async function handleMarketplacePurchaseRequestDecision(input: {
  purchaseRequestId: string;
  nextStatus: string;
  decision: "APPROVED" | "REJECTED" | "RETURNED";
  comments?: string | null;
  actorUserId: string;
}) {
  const binding =
    await prisma.marketplacePurchaseRequestLineBinding.findFirst({
      where: { purchaseRequestId: input.purchaseRequestId },
      select: { id: true },
    });
  if (!binding) return;

  const request = await prisma.purchaseRequest.findUniqueOrThrow({
    where: { id: input.purchaseRequestId },
    select: {
      id: true,
      tenantId: true,
      requesterId: true,
      requestNumber: true,
      approvals: {
        where: { decision: "PENDING" },
        orderBy: { sequence: "asc" },
        take: 1,
        include: {
          approver: { select: { id: true, email: true } },
        },
      },
    },
  });

  if (input.nextStatus === "APPROVED") {
    await orchestrateApprovedMarketplacePurchaseRequest({
      purchaseRequestId: request.id,
      actorUserId: input.actorUserId,
    });
    return;
  }

  if (input.nextStatus === "REJECTED" || input.decision === "RETURNED") {
    await notifyUser({
      tenantId: request.tenantId,
      userId: request.requesterId,
      eventType:
        input.nextStatus === "REJECTED"
          ? "MarketplacePurchaseRequest.Rejected"
          : "MarketplacePurchaseRequest.Returned",
      title:
        input.nextStatus === "REJECTED"
          ? "Purchase request rejected"
          : "Purchase request returned",
      message:
        `${request.requestNumber} was ${input.nextStatus === "REJECTED" ? "rejected" : "returned"}${input.comments ? `: ${input.comments}` : "."}`,
      actionUrl: `/app/requests/${request.id}`,
      priority: "HIGH",
    });
    return;
  }

  const next = request.approvals[0];
  if (next) {
    await notifyUser({
      tenantId: request.tenantId,
      userId: next.approver.id,
      eventType: "MarketplacePurchaseRequest.ApprovalRequired",
      title: "Marketplace purchase request approval required",
      message: `${request.requestNumber} is awaiting your approval.`,
      actionUrl: `/app/requests/${request.id}`,
      priority: "HIGH",
    });
  }
}
