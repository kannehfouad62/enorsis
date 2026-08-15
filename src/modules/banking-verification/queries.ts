import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getBuyerBankingVerificationQueue, getSupplierBankingProfileForTenant } from "@/core/banking-verification/service";

export async function getSupplierBankingWorkspace() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");
  return { session, profile: await getSupplierBankingProfileForTenant(session.user.tenantId) };
}

export async function getBankingVerificationWorkspace() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");
  const roles = new Set(session.user.roles);
  if (!["FINANCE", "ACCOUNTS_PAYABLE", "TENANT_ADMIN", "TENANT_OWNER", "PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT"].some((role) => roles.has(role))) redirect("/app/unauthorized");
  return { session, items: await getBuyerBankingVerificationQueue(session.user.tenantId) };
}
