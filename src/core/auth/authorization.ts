import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type EnorsisRole =
  | "PLATFORM_SUPER_ADMIN"
  | "PLATFORM_SUPPORT"
  | "PLATFORM_AUDITOR"
  | "TENANT_OWNER"
  | "TENANT_ADMIN"
  | "PROCUREMENT_EXECUTIVE"
  | "PROCUREMENT_MANAGER"
  | "BUYER"
  | "REQUESTER"
  | "APPROVER"
  | "FINANCE"
  | "LEGAL"
  | "RISK_COMPLIANCE"
  | "SUPPLIER_MANAGER"
  | "AUDITOR"
  | "VIEWER";

export async function requireAuthenticatedIdentity() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireAnyRole(roles: readonly EnorsisRole[]) {
  const user = await requireAuthenticatedIdentity();
  if (!user.roles.some((role) => roles.includes(role as EnorsisRole))) {
    redirect("/app/unauthorized");
  }
  return user;
}

export function hasAnyRole(
  userRoles: readonly string[],
  acceptedRoles: readonly EnorsisRole[],
) {
  return userRoles.some((role) => acceptedRoles.includes(role as EnorsisRole));
}

export function hasResourceScope(
  scopeIds: readonly string[],
  resourceId: string | null | undefined,
) {
  return scopeIds.length === 0 || (resourceId ? scopeIds.includes(resourceId) : false);
}

export function assertApprovalAuthority(
  approvalLimitUsd: string | null,
  amountUsd: number,
) {
  if (approvalLimitUsd === null) {
    throw new Error("No monetary approval authority is assigned.");
  }

  const limit = Number(approvalLimitUsd);
  if (!Number.isFinite(limit) || amountUsd > limit) {
    throw new Error(`Approval amount exceeds the assigned USD limit of ${limit}.`);
  }
}
