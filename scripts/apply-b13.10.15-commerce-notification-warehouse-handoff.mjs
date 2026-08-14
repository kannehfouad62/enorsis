#!/usr/bin/env node
import fs from "node:fs";

function patch(path, transform) {
  const before = fs.readFileSync(path, "utf8");
  const after = transform(before);
  if (after === before) {
    console.log(`No change required: ${path}`);
    return;
  }
  fs.writeFileSync(path, after);
  console.log(`Updated: ${path}`);
}

// 1. Notification core: targeted immediate delivery helper.
patch("src/core/notifications/service.ts", (source) => {
  if (!source.includes("deliverEnterpriseNotificationNow")) {
    source += `

export async function deliverEnterpriseNotificationNow(
  notificationId: string,
) {
  const deliveries =
    await prisma.enterpriseNotificationDelivery.findMany({
      where: {
        notificationId,
        status: "PENDING",
        availableAt: { lte: new Date() },
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

  const results = [];

  for (const delivery of deliveries) {
    const claimed =
      await prisma.enterpriseNotificationDelivery.updateMany({
        where: {
          id: delivery.id,
          status: "PENDING",
        },
        data: {
          status: "PROCESSING",
          processingAt: new Date(),
          attemptCount: { increment: 1 },
        },
      });

    if (!claimed.count) continue;
    results.push(await deliverNotification(delivery.id));
  }

  return results;
}

export async function createAndDeliverEnterpriseNotification(
  input: CreateNotificationInput,
) {
  const notification =
    await createEnterpriseNotification(input);

  await deliverEnterpriseNotificationNow(
    notification.id,
  );

  return notification;
}
`;
  }
  return source;
});

// 2. Marketplace notification helpers become immediate + retry-safe.
patch("src/core/marketplace-commerce/notifications.ts", (source) => {
  source = source.replace(
    `import { createEnterpriseNotification } from "@/core/notifications";`,
    `import { createAndDeliverEnterpriseNotification } from "@/core/notifications";`,
  );
  source = source.replaceAll(
    "await createEnterpriseNotification({",
    "await createAndDeliverEnterpriseNotification({",
  );

  if (!source.includes("notifyBuyerWarehouseTeam")) {
    source += `

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
`;
  }

  return source;
});

// 3. Direct marketplace approval notification also delivers immediately.
patch("src/modules/marketplace-commerce/actions.ts", (source) => {
  source = source.replace(
    `import { createEnterpriseNotification } from "@/core/notifications";`,
    `import { createAndDeliverEnterpriseNotification } from "@/core/notifications";`,
  );
  source = source.replace(
    `    await createEnterpriseNotification({
      tenantId: user.tenantId,
      eventType: "MarketplacePurchaseRequest.ApprovalRequired",`,
    `    await createAndDeliverEnterpriseNotification({
      tenantId: user.tenantId,
      eventType: "MarketplacePurchaseRequest.ApprovalRequired",`,
  );

  if (!source.includes("notifyBuyerWarehouseTeam")) {
    source = source.replace(
      `import { notifyUser } from "@/core/marketplace-commerce/notifications";`,
      `import {
  notifyBuyerWarehouseTeam,
  notifyUser,
} from "@/core/marketplace-commerce/notifications";`,
    );
  }

  const acceptanceAnchor = `  if (order.buyerRequesterUserId) {
    await notifyUser({
      tenantId: order.buyerTenantId,
      userId: order.buyerRequesterUserId,
      eventType: "MarketplaceOrder.Accepted",
      title: "Supplier accepted purchase order",
      message: \`\${order.orderNumber ?? "Your marketplace order"} was accepted by the supplier.\`,
      actionUrl: \`/app/requests/\${order.purchaseRequestId}\`,
    });
  }`;

  if (
    source.includes(acceptanceAnchor) &&
    !source.includes("MarketplaceOrder.ReadyForReceiving")
  ) {
    source = source.replace(
      acceptanceAnchor,
      `${acceptanceAnchor}

  await notifyBuyerWarehouseTeam({
    buyerTenantId: order.buyerTenantId,
    eventType: "MarketplaceOrder.ReadyForReceiving",
    title: "Supplier order accepted — prepare receiving",
    message:
      \`\${order.orderNumber ?? "Marketplace order"} was accepted by the supplier. The ordered product lines are now available in Warehouse Operations for receiving preparation.\`,
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
  });`,
    );
  }

  // Shipping should also alert warehouse team.
  const shipmentAnchor = `  if (order.buyerRequesterUserId) {
    await notifyUser({
      tenantId: order.buyerTenantId,
      userId: order.buyerRequesterUserId,
      eventType: "MarketplaceOrder.Shipped",
      title: "Marketplace order shipped",
      message: \`\${order.orderNumber ?? "Your order"} shipped via \${carrier}. Tracking: \${trackingNumber}.\`,
      actionUrl: "/app/requisition-to-order/receipts",
      priority: "HIGH",
    });
  }`;

  if (
    source.includes(shipmentAnchor) &&
    !source.includes("MarketplaceOrder.InboundShipment")
  ) {
    source = source.replace(
      shipmentAnchor,
      `${shipmentAnchor}

  await notifyBuyerWarehouseTeam({
    buyerTenantId: order.buyerTenantId,
    eventType: "MarketplaceOrder.InboundShipment",
    title: "Marketplace shipment inbound",
    message:
      \`\${order.orderNumber ?? "Marketplace order"} shipped via \${carrier}. Tracking: \${trackingNumber}. Receive the accepted product lines in Warehouse Operations when physically delivered.\`,
    actionUrl: "/app/warehouse-operations",
  });`,
    );
  }

  return source;
});

// 4. Approval escalation notification gets immediate processing.
patch("src/modules/purchase-requests/actions.ts", (source) => {
  source = source.replace(
    `import { createEnterpriseNotification } from "@/core/notifications";`,
    `import { createAndDeliverEnterpriseNotification } from "@/core/notifications";`,
  );
  source = source.replaceAll(
    "await createEnterpriseNotification({",
    "await createAndDeliverEnterpriseNotification({",
  );
  return source;
});

// 5. Warehouse query: accepted/shipped marketplace lines as inbound candidates.
patch("src/modules/warehouse-operations/queries.ts", (source) => {
  source = source.replace(
    `  const [sessions, locations, tasks, discrepancies] = await Promise.all([`,
    `  const [sessions, locations, tasks, discrepancies, marketplaceOrders] =
    await Promise.all([`,
  );

  source = source.replace(
    `    prisma.warehouseDiscrepancy.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return { sessions, locations, tasks, discrepancies };`,
    `    prisma.warehouseDiscrepancy.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.marketplaceSellerOrder.findMany({
      where: {
        buyerTenantId: tenantId,
        status: { in: ["ACCEPTED", "SHIPPED"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
  ]);

  const sellerTenantIds = [
    ...new Set(
      marketplaceOrders.map((order) => order.sellerTenantId),
    ),
  ];

  const sellerTenants = sellerTenantIds.length
    ? await prisma.tenant.findMany({
        where: { id: { in: sellerTenantIds } },
        select: { id: true, name: true },
      })
    : [];

  const sellerNameById = new Map(
    sellerTenants.map((tenant) => [tenant.id, tenant.name]),
  );

  const marketplaceInboundLines = marketplaceOrders.flatMap((order) => {
    const lines = Array.isArray(order.lineSnapshot)
      ? order.lineSnapshot
      : [];

    return lines.flatMap((raw, index) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
      const line = raw as Record<string, unknown>;

      const offeringId =
        typeof line.offeringId === "string"
          ? line.offeringId
          : \`line-\${index + 1}\`;
      const offeringName =
        typeof line.offeringName === "string"
          ? line.offeringName
          : "Marketplace product";
      const quantity = Number(line.quantity ?? 0);
      const unitPrice = Number(line.unitPrice ?? 0);

      if (!Number.isFinite(quantity) || quantity <= 0) return [];

      return [{
        key: \`\${order.id}:\${offeringId}:\${index}\`,
        orderId: order.id,
        orderNumber: order.orderNumber ?? order.id,
        purchaseRequestId: order.purchaseRequestId,
        purchaseOrderExecutionId:
          order.purchaseOrderExecutionId,
        buyerSupplierId: order.buyerSupplierId,
        sellerTenantId: order.sellerTenantId,
        sellerName:
          sellerNameById.get(order.sellerTenantId) ?? null,
        status: order.status,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
        expectedDeliveryAt:
          order.expectedDeliveryAt?.toISOString() ?? null,
        offeringId,
        offeringName,
        sku:
          typeof line.sku === "string" ? line.sku : null,
        quantity,
        unitOfMeasure:
          typeof line.unitOfMeasure === "string"
            ? line.unitOfMeasure
            : "EA",
        unitPrice:
          Number.isFinite(unitPrice) ? unitPrice : 0,
        currencyCode:
          typeof line.currencyCode === "string"
            ? line.currencyCode
            : order.currencyCode,
      }];
    });
  });

  return {
    sessions,
    locations,
    tasks,
    discrepancies,
    marketplaceInboundLines,
  };`,
  );

  return source;
});

// 6. Warehouse receive action: audit marketplace-to-warehouse bridge.
patch("src/modules/warehouse-operations/actions.ts", (source) => {
  if (!source.includes("@/lib/prisma")) {
    source = source.replace(
      `import { requireAnyRole } from "@/core/auth/authorization";`,
      `import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";`,
    );
  }

  source = source.replace(
    `  await createWarehouseReceivingSession({
    tenantId: user.tenantId,`,
    `  const receiving = await createWarehouseReceivingSession({
    tenantId: user.tenantId,`,
  );

  if (!source.includes("warehouse.marketplace_receiving.recorded")) {
    source = source.replace(
      `  revalidatePath("/app/warehouse-operations");
}

export async function configureWarehouseLocationAction`,
      `  if (field(data, "sourceType") === "MARKETPLACE_ORDER") {
    await prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: "warehouse.marketplace_receiving.recorded",
        resourceType: "WarehouseReceivingSession",
        resourceId: receiving.id,
        after: {
          receivingNumber: receiving.receivingNumber,
          marketplaceSellerOrderId: field(data, "sourceId"),
          purchaseOrderExecutionId:
            field(data, "purchaseOrderId") || null,
          supplierId: field(data, "supplierId") || null,
          lineReference: field(data, "lineReference"),
          inventoryItemId: field(data, "inventoryItemId"),
          description: field(data, "description"),
          expectedQuantity: Number(field(data, "expectedQuantity")),
          receivedQuantity: Number(field(data, "receivedQuantity")),
          condition: field(data, "condition"),
          serialLotReference:
            field(data, "serialLotReference") || null,
          carrierReference:
            field(data, "carrierReference") || null,
          deliveryReference:
            field(data, "deliveryReference") || null,
        },
      },
    });
  }

  revalidatePath("/app/warehouse-operations");
}

export async function configureWarehouseLocationAction`,
    );
  }

  return source;
});

// 7. Warehouse page: marketplace inbound receiving UI before legacy/manual form.
patch("src/app/app/warehouse-operations/page.tsx", (source) => {
  if (!source.includes("@/components/warehouse/MarketplaceInboundReceivingForm")) {
    source = source.replace(
      `import { getWarehouseOperationsWorkspace } from "@/modules/warehouse-operations/queries";`,
      `import { getWarehouseOperationsWorkspace } from "@/modules/warehouse-operations/queries";
import { MarketplaceInboundReceivingForm } from "@/components/warehouse/MarketplaceInboundReceivingForm";`,
    );
  }

  const receiveSection = `      <section className={\`\${card} mt-8\`}>
        <h2 className="text-xl font-black">Receive shipment</h2>`;

  if (
    source.includes(receiveSection) &&
    !source.includes("Marketplace accepted orders")
  ) {
    source = source.replace(
      receiveSection,
      `      <section className={\`\${card} mt-8\`}>
        <h2 className="text-xl font-black">Marketplace accepted orders</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
          Accepted and shipped marketplace product lines are handed off here
          automatically from Procurement. Select the inbound product to prefill
          order, supplier, product, expected quantity and shipment information,
          then record what physically arrived.
        </p>
        <MarketplaceInboundReceivingForm
          lines={data.marketplaceInboundLines}
        />
      </section>

      <section className={\`\${card} mt-6\`}>
        <h2 className="text-xl font-black">Manual / non-marketplace receiving</h2>`,
    );
  }

  return source;
});

console.log(
  "B13.10.15 reliable commerce notifications and procurement-to-warehouse handoff integration complete.",
);
