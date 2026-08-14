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

// ---------------------------------------------------------
// 1. Give the notification provider registry a built-in EMAIL
//    provider backed by the same Resend configuration used elsewhere.
// ---------------------------------------------------------
patch("src/core/notifications/providers.ts", (source) => {
  if (
    !source.includes(
      "./resend-email-provider",
    )
  ) {
    source += `

let builtInEmailProvider:
  | NotificationProvider
  | null = null;

async function getBuiltInEmailProvider() {
  if (!builtInEmailProvider) {
    const module = await import(
      "./resend-email-provider"
    );
    builtInEmailProvider =
      module.resendEmailNotificationProvider;
  }

  return builtInEmailProvider;
}
`;
  }

  source = source.replace(
    `export function getNotificationProvider(channel: string) {
  return providers.get(channel) ?? null;
}`,
    `export async function getNotificationProvider(
  channel: string,
) {
  const registered =
    providers.get(channel);

  if (registered) {
    return registered;
  }

  if (channel === "EMAIL") {
    return getBuiltInEmailProvider();
  }

  return null;
}`,
  );

  return source;
});

// service must await the now-lazy provider resolution.
patch("src/core/notifications/service.ts", (source) => {
  source = source.replace(
    `      const provider = getNotificationProvider(delivery.channel);`,
    `      const provider =
        await getNotificationProvider(
          delivery.channel,
        );`,
  );

  return source;
});

// ---------------------------------------------------------
// 2. Marketplace PR approval notification:
//    read the actual persisted approval + approver after transaction.
// ---------------------------------------------------------
patch("src/modules/marketplace-commerce/actions.ts", (source) => {
  const old = `  const firstApprover = approvalChain[0];
  if (firstApprover) {
    await createAndDeliverEnterpriseNotification({
      tenantId: user.tenantId,
      eventType: "MarketplacePurchaseRequest.ApprovalRequired",
      recipientUserId: firstApprover.user.id,
      recipientAddress: firstApprover.user.email ?? undefined,
      title: "Marketplace purchase request approval required",
      message: \`\${requestNumber} for \${originalCurrency} \${totalAmount.toLocaleString()} is awaiting your approval.\`,
      actionUrl: \`/app/requests/\${request.id}\`,
      channels: firstApprover.user.email ? ["IN_APP", "EMAIL"] : ["IN_APP"],
      priority: "HIGH",
    });
  }`;

  const updated = `  const persistedApproval =
    await prisma.purchaseRequestApproval.findFirst({
      where: {
        purchaseRequestId: request.id,
      },
      orderBy: {
        sequence: "asc",
      },
      select: {
        id: true,
        approverId: true,
        sequence: true,
      },
    });

  if (persistedApproval) {
    const approver =
      await prisma.user.findUnique({
        where: {
          id: persistedApproval.approverId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
        },
      });

    if (!approver || !approver.isActive) {
      await prisma.auditEvent.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          actorType: "SYSTEM",
          actorId: user.id,
          actorLabel: user.email,
          action:
            "marketplace.purchase_request.approval_notification.failed",
          resourceType:
            "PurchaseRequestApproval",
          resourceId:
            persistedApproval.id,
          outcome: "FAILURE",
          reason:
            "Persisted approver user is missing or inactive.",
          after: {
            purchaseRequestId:
              request.id,
            requestNumber,
            approverId:
              persistedApproval.approverId,
          },
        },
      });
    } else {
      await notifyUser({
        tenantId: user.tenantId,
        userId: approver.id,
        eventType:
          "MarketplacePurchaseRequest.ApprovalRequired",
        title:
          "Marketplace purchase request approval required",
        message:
          \`\${requestNumber} for \${originalCurrency} \${totalAmount.toLocaleString()} is awaiting your approval.\`,
        actionUrl:
          \`/app/requests/\${request.id}\`,
        priority: "HIGH",
      });

      await prisma.auditEvent.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          actorType: "SYSTEM",
          actorId: user.id,
          actorLabel: user.email,
          action:
            "marketplace.purchase_request.approval_notification.sent",
          resourceType:
            "PurchaseRequestApproval",
          resourceId:
            persistedApproval.id,
          after: {
            purchaseRequestId:
              request.id,
            requestNumber,
            approverId:
              approver.id,
            approverEmail:
              approver.email,
            sequence:
              persistedApproval.sequence,
            channels:
              approver.email
                ? ["IN_APP", "EMAIL"]
                : ["IN_APP"],
          },
        },
      });
    }
  }`;

  if (!source.includes(old)) {
    throw new Error(
      "Marketplace approval notification block did not match the current main branch.",
    );
  }

  source = source.replace(old, updated);

  // remove direct helper import if now unused
  source = source.replace(
    `import { createAndDeliverEnterpriseNotification } from "@/core/notifications";\n`,
    "",
  );

  return source;
});

console.log(
  "B13.10.21 marketplace approval notification reliability integration complete.",
);
