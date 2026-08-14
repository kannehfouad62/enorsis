#!/usr/bin/env node
import fs from "node:fs";

const failures = [];
const read = (path) =>
  fs.existsSync(path)
    ? fs.readFileSync(path, "utf8")
    : "";

const provider = read(
  "src/core/notifications/providers.ts",
);
const emailProvider = read(
  "src/core/notifications/resend-email-provider.ts",
);
const service = read(
  "src/core/notifications/service.ts",
);
const marketplace = read(
  "src/modules/marketplace-commerce/actions.ts",
);

if (
  !provider.includes(
    'if (channel === "EMAIL")',
  )
) {
  failures.push(
    "Notification registry does not provide built-in EMAIL fallback.",
  );
}

if (
  !emailProvider.includes(
    "RESEND_API_KEY",
  ) ||
  !emailProvider.includes(
    "RESEND_FROM_EMAIL",
  )
) {
  failures.push(
    "Resend notification provider is not using governed Enorsis email configuration.",
  );
}

if (
  !service.includes(
    "await getNotificationProvider",
  )
) {
  failures.push(
    "Notification delivery does not await lazy provider resolution.",
  );
}

if (
  !marketplace.includes(
    "prisma.purchaseRequestApproval.findFirst",
  )
) {
  failures.push(
    "Marketplace approval notification does not resolve persisted approval.",
  );
}

if (
  !marketplace.includes(
    "marketplace.purchase_request.approval_notification.sent",
  )
) {
  failures.push(
    "Successful approval notification is not audit logged.",
  );
}

if (
  !marketplace.includes(
    "marketplace.purchase_request.approval_notification.failed",
  )
) {
  failures.push(
    "Failed approval notification target resolution is not audit logged.",
  );
}

if (
  !marketplace.includes(
    `eventType:
          "MarketplacePurchaseRequest.ApprovalRequired"`,
  )
) {
  failures.push(
    "Marketplace ApprovalRequired notification is missing.",
  );
}

if (failures.length) {
  console.error("B13.10.21 validation failed:");
  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );
  process.exit(1);
}

console.log(
  "B13.10.21 marketplace approval notification reliability validation passed.",
);
