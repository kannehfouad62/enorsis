import { prisma } from "@/lib/prisma";

type SidebarActionCountUser = {
  id: string;
  tenantId: string;
  roles: string[];
};

const SUPPLIER_REVIEW_ROLES = new Set([
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "PROCUREMENT_MANAGER",
  "TENANT_ADMIN",
  "TENANT_OWNER",
]);

export type SidebarActionCounts = Record<string, number>;

export async function getSidebarActionCountsForUser(
  user: SidebarActionCountUser,
): Promise<SidebarActionCounts> {
  const counts: SidebarActionCounts = {};
  const jobs: Array<Promise<void>> = [];

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

  if (user.roles.some((role) => SUPPLIER_REVIEW_ROLES.has(role))) {
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

  await Promise.all(jobs);

  return counts;
}
