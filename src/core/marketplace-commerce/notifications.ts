import "server-only";

import { createAndDeliverEnterpriseNotification } from "@/core/notifications";
import type { PlatformRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const SELLER_NOTIFICATION_ROLES: PlatformRole[] = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "SUPPLIER_MANAGER",
];

export async function notifyUser(input: {
  tenantId: string;
  userId: string;
  eventType: string;
  title: string;
  message: string;
  actionUrl: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  correlationId?: string | null;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { email: true },
  });

  await createAndDeliverEnterpriseNotification({
    tenantId: input.tenantId,
    eventType: input.eventType,
    recipientUserId: input.userId,
    recipientAddress: user?.email ?? undefined,
    title: input.title,
    message: input.message,
    actionUrl: input.actionUrl,
    channels: user?.email ? ["IN_APP", "EMAIL"] : ["IN_APP"],
    priority: input.priority ?? "HIGH",
    correlationId: input.correlationId ?? undefined,
  });
}

export async function notifySellerTenant(input: {
  sellerTenantId: string;
  eventType: string;
  title: string;
  message: string;
  actionUrl?: string;
  correlationId?: string | null;
}) {
  const memberships = await prisma.membership.findMany({
    where: {
      tenantId: input.sellerTenantId,
      status: "ACTIVE",
      roles: { hasSome: SELLER_NOTIFICATION_ROLES },
    },
    include: {
      user: { select: { id: true, email: true } },
    },
    take: 50,
  });

  for (const membership of memberships) {
    await createAndDeliverEnterpriseNotification({
      tenantId: input.sellerTenantId,
      eventType: input.eventType,
      recipientUserId: membership.user.id,
      recipientAddress: membership.user.email ?? undefined,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl ?? "/app/marketplace/orders",
      channels: membership.user.email
        ? ["IN_APP", "EMAIL"]
        : ["IN_APP"],
      priority: "HIGH",
      correlationId: input.correlationId ?? undefined,
    });
  }
}


const BUYER_WAREHOUSE_NOTIFICATION_ROLES: PlatformRole[] = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_MANAGER",
  "BUYER",
];

export async function notifyBuyerWarehouseTeam(input: {
  buyerTenantId: string;
  eventType: string;
  title: string;
  message: string;
  actionUrl?: string;
  correlationId?: string | null;
}) {
  const memberships = await prisma.membership.findMany({
    where: {
      tenantId: input.buyerTenantId,
      status: "ACTIVE",
      roles: {
        hasSome: BUYER_WAREHOUSE_NOTIFICATION_ROLES,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    take: 50,
  });

  for (const membership of memberships) {
    await createAndDeliverEnterpriseNotification({
      tenantId: input.buyerTenantId,
      eventType: input.eventType,
      recipientUserId: membership.user.id,
      recipientAddress: membership.user.email ?? undefined,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl ?? "/app/warehouse-operations",
      channels: membership.user.email
        ? ["IN_APP", "EMAIL"]
        : ["IN_APP"],
      priority: "HIGH",
      correlationId: input.correlationId ?? undefined,
    });
  }
}
