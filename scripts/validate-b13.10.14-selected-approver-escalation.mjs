#!/usr/bin/env node
import fs from "node:fs";

const failures = [];
const read = (path) => fs.readFileSync(path, "utf8");

const types = read("src/core/marketplace-commerce/types.ts");
const checkout = read("src/components/marketplace/MarketplaceCheckout.tsx");
const checkoutQuery = read("src/modules/marketplace-commerce/queries.ts");
const commerceActions = read("src/modules/marketplace-commerce/actions.ts");
const prActions = read("src/modules/purchase-requests/actions.ts");
const prQueries = read("src/modules/purchase-requests/queries.ts");
const prPage = read("src/app/app/requests/[id]/page.tsx");

if (!types.includes("preferredApproverId?: string")) failures.push("Marketplace checkout input has no selected approver field.");
if (!checkout.includes("Send approval request to")) failures.push("Purchase Request checkout has no approver dropdown.");
if (!checkoutQuery.includes('roles: { has: "APPROVER" }')) failures.push("Checkout approver list is not restricted to approvers.");
if (!commerceActions.includes("preferredApproverId")) failures.push("Marketplace submission does not route to selected approver.");
if (!commerceActions.includes("requiresApprovalEscalation")) failures.push("Submission audit evidence lacks escalation posture.");
if (!prActions.includes("escalatePurchaseRequestApprovalAction")) failures.push("Approval escalation action is missing.");
if (!prActions.includes("purchase_request.approval_escalated")) failures.push("Approval escalation is not audited.");
if (!prActions.includes("PurchaseRequest.ApprovalEscalated")) failures.push("Escalated approver notification is missing.");
if (!prQueries.includes("escalationApprovers")) failures.push("Eligible escalation approvers are not resolved.");
if (!prPage.includes("Approval authority exceeded")) failures.push("Insufficient authority UI is missing.");
if (!prPage.includes("Escalate approval")) failures.push("Escalation control is missing.");

if (failures.length) {
  console.error("B13.10.14 validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "B13.10.14 selected approver, approval-limit enforcement and governed escalation validation passed.",
);
