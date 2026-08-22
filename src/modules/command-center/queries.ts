import { prisma } from "@/lib/prisma";
import {
  getSidebarActionCountsForUser,
} from "@/modules/navigation/sidebar-action-counts";
import type {
  TenantCommercialPersonaValue,
} from "@/core/tenancy/commercial-persona";

export type CommandCenterUser = {
  id: string;
  tenantId: string;
  name?: string | null;
  email?: string | null;
  roles: string[];
  commercialPersona: TenantCommercialPersonaValue;
};

function number(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toString" in value
  ) {
    const parsed = Number(String(value));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getBuyerCommandCenterData(
  user: CommandCenterUser,
) {
  const [
    tenant,
    demand,
    approvedDemand,
    approvedSuppliers,
    reconciliations,
    approvals,
    notifications,
    recentRequests,
    actionCounts,
  ] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        name: true,
        baseCurrencyCode: true,
        commercialPersona: true,
      },
    }),
    prisma.purchaseRequest.aggregate({
      where: {
        tenantId: user.tenantId,
        status: {
          not: "CANCELLED",
        },
      },
      _sum: {
        usdEquivalent: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.purchaseRequest.aggregate({
      where: {
        tenantId: user.tenantId,
        status: "APPROVED",
      },
      _sum: {
        usdEquivalent: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.supplier.count({
      where: {
        tenantId: user.tenantId,
        status: "APPROVED",
        isTenantSelfProfile: false,
      },
    }),
    prisma.bankPaymentReconciliation.findMany({
      where: {
        tenantId: user.tenantId,
        status: {
          in: ["PARTIAL", "UNMATCHED", "DUPLICATE"],
        },
        resolutionStatus: {
          not: "RESOLVED",
        },
      },
      select: {
        expectedAmount: true,
        settledAmount: true,
        currencyCode: true,
      },
    }),
    prisma.purchaseRequestApproval.findMany({
      where: {
        approverId: user.id,
        decision: "PENDING",
        purchaseRequest: {
          tenantId: user.tenantId,
        },
      },
      include: {
        purchaseRequest: {
          include: {
            requester: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        sequence: "asc",
      },
      take: 8,
    }),
    prisma.enterpriseNotification.findMany({
      where: {
        tenantId: user.tenantId,
        recipientUserId: user.id,
        archivedAt: null,
      },
      select: {
        id: true,
        title: true,
        message: true,
        actionUrl: true,
        createdAt: true,
        readAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
    }),
    prisma.purchaseRequest.findMany({
      where: {
        tenantId: user.tenantId,
      },
      select: {
        id: true,
        requestNumber: true,
        title: true,
        status: true,
        priority: true,
        usdEquivalent: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
    }),
    getSidebarActionCountsForUser({
      id: user.id,
      tenantId: user.tenantId,
      roles: user.roles,
      commercialPersona: user.commercialPersona,
    }),
  ]);

  const reconciliationExposure = reconciliations.reduce(
    (sum, item) =>
      sum +
      Math.abs(
        number(item.expectedAmount) -
          number(item.settledAmount),
      ),
    0,
  );

  const demandValue = number(demand._sum.usdEquivalent);
  const approvedDemandValue = number(
    approvedDemand._sum.usdEquivalent,
  );

  const largestPendingRequest = approvals
    .map((approval) => approval.purchaseRequest)
    .sort(
      (a, b) =>
        number(b.usdEquivalent) -
        number(a.usdEquivalent),
    )[0];

  const operationalPanels = [
    {
      name: "Procurement demand",
      value: demandValue,
      valueType: "currency" as const,
      detail: `${demand._count._all} non-cancelled request${
        demand._count._all === 1 ? "" : "s"
      }`,
      href: "/app/requests",
      risk:
        approvals.length > 0
          ? "Attention"
          : "Normal",
    },
    {
      name: "Supplier network",
      value: approvedSuppliers,
      valueType: "number" as const,
      detail: "Approved supplier records",
      href: "/app/suppliers",
      risk: "Normal",
    },
    {
      name: "Payment operations",
      value:
        actionCounts[
          "/app/requisition-to-order/payments"
        ] ?? 0,
      valueType: "number" as const,
      detail: "Items requiring finance action",
      href: "/app/requisition-to-order/payments",
      risk:
        (actionCounts[
          "/app/requisition-to-order/payments"
        ] ?? 0) > 0
          ? "Attention"
          : "Normal",
    },
    {
      name: "Treasury controls",
      value: reconciliationExposure,
      valueType: "currency" as const,
      detail: "Unresolved reconciliation variance",
      href:
        "/app/requisition-to-order/reconciliation/analytics",
      risk:
        reconciliationExposure > 0
          ? "Attention"
          : "Normal",
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    tenant: {
      name: tenant?.name ?? "Organization",
      baseCurrencyCode:
        tenant?.baseCurrencyCode ?? "USD",
    },
    user: {
      name:
        user.name ??
        user.email ??
        "Platform Administrator",
    },
    summary: {
      requestedDemandUsd: demandValue,
      requestCount: demand._count._all,
      approvedDemandUsd: approvedDemandValue,
      approvedRequestCount:
        approvedDemand._count._all,
      approvedSuppliers,
      reconciliationExposureUsd:
        reconciliationExposure,
      pendingApprovals: approvals.length,
      unreadNotifications:
        actionCounts["/app/notifications"] ?? 0,
    },
    operationalPanels,
    approvals: approvals.map((approval) => ({
      id: approval.id,
      requestId:
        approval.purchaseRequest.id,
      requestNumber:
        approval.purchaseRequest.requestNumber,
      title: approval.purchaseRequest.title,
      requester:
        approval.purchaseRequest.requester.name ??
        approval.purchaseRequest.requester.email ??
        "Unknown requester",
      valueUsd: number(
        approval.purchaseRequest.usdEquivalent,
      ),
      priority:
        approval.purchaseRequest.priority,
      status:
        approval.purchaseRequest.status,
      href: `/app/requests/${approval.purchaseRequest.id}`,
    })),
    activity: notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      detail: notification.message,
      href:
        notification.actionUrl ??
        "/app/notifications",
      createdAt:
        notification.createdAt.toISOString(),
      unread: notification.readAt === null,
    })),
    recentRequests: recentRequests.map((request) => ({
      id: request.id,
      requestNumber: request.requestNumber,
      title: request.title,
      status: request.status,
      priority: request.priority,
      valueUsd: number(request.usdEquivalent),
      createdAt: request.createdAt.toISOString(),
      href: `/app/requests/${request.id}`,
    })),
    largestPendingRequest: largestPendingRequest
      ? {
          id: largestPendingRequest.id,
          requestNumber:
            largestPendingRequest.requestNumber,
          title: largestPendingRequest.title,
          valueUsd: number(
            largestPendingRequest.usdEquivalent,
          ),
          href: `/app/requests/${largestPendingRequest.id}`,
        }
      : null,
  };
}

export type BuyerCommandCenterData =
  Awaited<
    ReturnType<
      typeof getBuyerCommandCenterData
    >
  >;
