import type { TenantCommercialPersonaValue } from "@/core/tenancy/commercial-persona";
import { prisma } from "@/lib/prisma";

type SidebarActionCountUser = {
  id: string;
  tenantId: string;
  roles: string[];
  commercialPersona: TenantCommercialPersonaValue;
};

const SUPPLIER_REVIEW_ROLES = new Set([
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "PROCUREMENT_MANAGER",
  "TENANT_ADMIN",
  "TENANT_OWNER",
]);

const BUYER_OPERATION_ROLES = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "ACCOUNTS_PAYABLE",
  "FINANCE",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
]);

export type SidebarActionCounts = Record<string, number>;

export function getActionCountForHref(
  counts: SidebarActionCounts,
  href: string,
) {
  return Object.entries(counts)
    .filter(
      ([actionHref]) =>
        actionHref === href || actionHref.startsWith(`${href}/`),
    )
    .reduce((sum, [, count]) => sum + count, 0);
}

export async function getSidebarActionCountsForUser(
  user: SidebarActionCountUser,
): Promise<SidebarActionCounts> {
  const counts: SidebarActionCounts = {};
  const jobs: Array<Promise<void>> = [];

  // User-specific unread notification count. This supplements, not replaces,
  // the existing top-bar notification bell.
  jobs.push(
    prisma.enterpriseNotification
      .count({
        where: {
          tenantId: user.tenantId,
          recipientUserId: user.id,
          archivedAt: null,
          readAt: null,
        },
      })
      .then((count) => {
        counts["/app/notifications"] = count;
      }),
  );

  // Cross-tenant platform verification is reserved for Enorsis Super Admin.
  if (user.roles.includes("PLATFORM_SUPER_ADMIN")) {
    jobs.push(
      prisma.supplierDocument
        .count({
          where: {
            status: "PENDING_VERIFICATION",
            supplier: {
              isTenantSelfProfile: true,
            },
          },
        })
        .then((count) => {
          counts["/app/platform/supplier-verification"] = count;
        }),
    );
  }

  // Purchase request badge is user-specific: only approvals assigned to this user.
  if (user.commercialPersona !== "SUPPLIER") {
    jobs.push(
      prisma.purchaseRequestApproval
        .count({
          where: {
            approverId: user.id,
            decision: "PENDING",
            purchaseRequest: {
              tenantId: user.tenantId,
            },
          },
        })
        .then((count) => {
          counts["/app/requests"] = count;
        }),
    );
  }

  // Supplier-side marketplace actions. Supplier-only users see only their own tenant's orders.
  if (
    ["SUPPLIER", "BUYER_SUPPLIER"].includes(user.commercialPersona) &&
    user.roles.some((role) =>
      ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER"].includes(role),
    )
  ) {
    jobs.push(
      prisma.marketplaceSellerOrder
        .count({
          where: {
            sellerTenantId: user.tenantId,
            status: {
              in: ["PLACED", "ACCEPTED"],
            },
          },
        })
        .then((count) => {
          counts["/app/marketplace/orders"] = count;
        }),
    );

    jobs.push(
      Promise.all([
        prisma.supplierOnboardingQuestionnaire.count({
          where: {
            tenantId: user.tenantId,
            supplier: {
              isTenantSelfProfile: true,
            },
            status: {
              in: ["SENT", "IN_PROGRESS"],
            },
          },
        }),
        prisma.supplierPortalTask.count({
          where: {
            tenantId: user.tenantId,
            supplier: {
              isTenantSelfProfile: true,
            },
            status: {
              in: ["OPEN", "IN_PROGRESS", "BLOCKED"],
            },
          },
        }),
        prisma.supplierPortalMessage.count({
          where: {
            tenantId: user.tenantId,
            supplier: {
              isTenantSelfProfile: true,
            },
            direction: "BUYER_TO_SUPPLIER",
            readAt: null,
          },
        }),
      ]).then(([questionnaires, tasks, messages]) => {
        counts["/app/supplier-portal"] =
          questionnaires + tasks + messages;
        counts["/app/supplier-portal/collaboration"] =
          tasks + messages;
      }),
    );
  }

  // Buyer-side operational action queues. Supplier-only tenants never execute these queries.
  if (
    user.commercialPersona !== "SUPPLIER" &&
    user.roles.some((role) => BUYER_OPERATION_ROLES.has(role))
  ) {
    jobs.push(
      (async () => {
        const receivedSources =
          await prisma.warehouseReceivingSession.findMany({
            where: {
              tenantId: user.tenantId,
              sourceType: "MARKETPLACE_ORDER",
              sourceId: {
                not: null,
              },
            },
            select: {
              sourceId: true,
            },
            distinct: ["sourceId"],
          });

        const receivedOrderIds = receivedSources
          .map((item) => item.sourceId)
          .filter((id): id is string => Boolean(id));

        const count = await prisma.marketplaceSellerOrder.count({
          where: {
            buyerTenantId: user.tenantId,
            status: "SHIPPED",
            ...(receivedOrderIds.length
              ? {
                  id: {
                    notIn: receivedOrderIds,
                  },
                }
              : {}),
          },
        });

        counts["/app/warehouse-operations"] = count;
      })(),
    );

    jobs.push(
      prisma.supplierInvoice
        .count({
          where: {
            tenantId: user.tenantId,
            exceptions: {
              some: {
                status: "OPEN",
              },
            },
          },
        })
        .then((count) => {
          counts["/app/purchasing/invoices"] = count;
        }),
    );

    jobs.push(
      Promise.all([
        prisma.purchaseOrderExecution.count({
          where: {
            tenantId: user.tenantId,
            status: {
              in: ["ISSUED", "ACKNOWLEDGED", "PARTIALLY_RECEIVED"],
            },
          },
        }),
        prisma.goodsReceiptSession.count({
          where: {
            tenantId: user.tenantId,
            status: "DRAFT",
          },
        }),
        prisma.goodsReceiptSession.count({
          where: {
            tenantId: user.tenantId,
            exceptions: {
              some: {
                status: {
                  not: "RESOLVED",
                },
              },
            },
          },
        }),
      ]).then(([orders, drafts, sessionsWithExceptions]) => {
        counts["/app/requisition-to-order/receipts"] =
          orders + drafts + sessionsWithExceptions;
      }),
    );
  }

  // Buyer-managed supplier document review remains tenant-scoped.
  if (
    user.commercialPersona !== "SUPPLIER" &&
    user.roles.some((role) => SUPPLIER_REVIEW_ROLES.has(role))
  ) {
    jobs.push(
      prisma.supplierDocument
        .count({
          where: {
            status: "PENDING_VERIFICATION",
            supplier: {
              tenantId: user.tenantId,
              isTenantSelfProfile: false,
            },
          },
        })
        .then((count) => {
          counts["/app/suppliers"] = count;
        }),
    );
  }

  // Action badges are supplemental UI. A failed count query must never
  // take down an operational workspace.
  await Promise.allSettled(jobs);

  return counts;
}
