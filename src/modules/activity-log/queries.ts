import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 100;

type ActivityLogSearch = {
  q?: string;
  action?: string;
  resourceType?: string;
  tenantId?: string;
  from?: string;
  to?: string;
  page?: string;
};

function parseDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? undefined
    : parsed;
}

export async function getActivityLog(
  params: ActivityLogSearch,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = session.user.roles ?? [];
  const isPlatformSuperAdmin = roles.includes(
    "PLATFORM_SUPER_ADMIN",
  );
  const isTenantAdmin =
    roles.includes("TENANT_OWNER") ||
    roles.includes("TENANT_ADMIN");

  if (!isPlatformSuperAdmin && !isTenantAdmin) {
    redirect("/app/unauthorized");
  }

  const q = params.q?.trim();
  const action = params.action?.trim();
  const resourceType = params.resourceType?.trim();
  const from = parseDate(params.from);
  const to = parseDate(params.to);
  const page = Math.max(
    1,
    Number.parseInt(params.page ?? "1", 10) || 1,
  );

  const tenantId = isPlatformSuperAdmin
    ? params.tenantId?.trim() || undefined
    : session.user.tenantId;

  const relatedResourceIds = new Set<string>();
  const relatedUserIds = new Set<string>();

  if (q) {
    const [
      offerings,
      requestLines,
      users,
    ] = await Promise.all([
      prisma.supplierMarketplaceOffering.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
            {
              shortDescription: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              brand: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              modelNumber: {
                contains: q,
                mode: "insensitive",
              },
            },
          ],
          ...(tenantId ? { tenantId } : {}),
        },
        select: { id: true },
        take: 250,
      }),
      prisma.purchaseRequestLine.findMany({
        where: {
          OR: [
            {
              description: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              supplierSuggestion: {
                contains: q,
                mode: "insensitive",
              },
            },
          ],
          ...(tenantId
            ? {
                purchaseRequest: {
                  tenantId,
                },
              }
            : {}),
        },
        select: {
          purchaseRequestId: true,
        },
        take: 250,
      }),
      prisma.user.findMany({
        where: {
          OR: [
            {
              name: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: q,
                mode: "insensitive",
              },
            },
          ],
        },
        select: { id: true },
        take: 250,
      }),
    ]);

    offerings.forEach((item) =>
      relatedResourceIds.add(item.id),
    );
    requestLines.forEach((item) =>
      relatedResourceIds.add(
        item.purchaseRequestId,
      ),
    );
    users.forEach((item) =>
      relatedUserIds.add(item.id),
    );
  }

  const where = {
    ...(tenantId ? { tenantId } : {}),
    ...(action
      ? {
          action: {
            contains: action,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(resourceType
      ? {
          resourceType: {
            contains: resourceType,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...((from || to)
      ? {
          occurredAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            {
              searchText: {
                contains: q.toLowerCase(),
              },
            },
            ...(relatedResourceIds.size
              ? [
                  {
                    resourceId: {
                      in: Array.from(
                        relatedResourceIds,
                      ),
                    },
                  },
                ]
              : []),
            ...(relatedUserIds.size
              ? [
                  {
                    userId: {
                      in: Array.from(
                        relatedUserIds,
                      ),
                    },
                  },
                ]
              : []),
          ],
        }
      : {}),
  };

  const [events, total, tenants] =
    await Promise.all([
      prisma.auditEvent.findMany({
        where,
        orderBy: {
          occurredAt: "desc",
        },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              commercialPersona: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.auditEvent.count({ where }),
      isPlatformSuperAdmin
        ? prisma.tenant.findMany({
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              commercialPersona: true,
            },
          })
        : Promise.resolve([]),
    ]);

  const safeEvents = events.map((event) => ({
    id: event.id,
    tenantId: event.tenantId,
    tenant: event.tenant,
    actor: event.user,
    actorType: event.actorType,
    actorId: event.actorId,
    actorLabel: event.actorLabel,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    outcome: event.outcome,
    reason: event.reason,
    requestId: event.requestId,
    before: event.before,
    after: event.after,
    metadata: event.metadata,
    occurredAt: event.occurredAt,
    ...(isPlatformSuperAdmin
      ? {
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
        }
      : {}),
  }));

  return {
    events: safeEvents,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(
      1,
      Math.ceil(total / PAGE_SIZE),
    ),
    isPlatformSuperAdmin,
    tenants,
    selectedTenantId: tenantId,
  };
}
