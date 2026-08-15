"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/core/auth/authorization";
import { rejectSupplierBanking, upsertSupplierBankingProfile, verifySupplierBanking } from "@/core/banking-verification/service";
const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

export async function submitSupplierBankingProfileAction(data: FormData) {
  const user = await requireAnyRole(["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER"]);
  let errorMessage: string | null = null;
  try {
    await upsertSupplierBankingProfile({ sellerTenantId: user.tenantId, actorUserId: user.id, actorEmail: user.email, banking: { accountHolderName: field(data, "accountHolderName"), bankName: field(data, "bankName"), bankCountryCode: field(data, "bankCountryCode"), currencyCode: field(data, "currencyCode") || "USD", accountType: field(data, "accountType") || undefined, accountNumber: field(data, "accountNumber"), routingNumber: field(data, "routingNumber") || undefined, swiftBic: field(data, "swiftBic") || undefined, iban: field(data, "iban") || undefined } });
    revalidatePath("/app/supplier-portal/banking");
  } catch (error) { errorMessage = error instanceof Error ? error.message : "Banking profile submission failed."; }
  if (errorMessage) redirect(`/app/supplier-portal/banking?error=${encodeURIComponent(errorMessage)}`);
  redirect("/app/supplier-portal/banking?saved=1");
}

export async function verifySupplierBankingAction(data: FormData) {
  const user = await requireAnyRole(["FINANCE", "ACCOUNTS_PAYABLE", "TENANT_ADMIN", "TENANT_OWNER", "PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT"]);
  await verifySupplierBanking({ buyerTenantId: user.tenantId, sellerTenantId: field(data, "sellerTenantId"), actorUserId: user.id, actorEmail: user.email });
  revalidatePath("/app/requisition-to-order/banking-verification");
  revalidatePath("/app/requisition-to-order/payment-readiness");
}

export async function rejectSupplierBankingAction(data: FormData) {
  const user = await requireAnyRole(["FINANCE", "ACCOUNTS_PAYABLE", "TENANT_ADMIN", "TENANT_OWNER", "PLATFORM_SUPER_ADMIN", "PLATFORM_SUPPORT"]);
  await rejectSupplierBanking({ buyerTenantId: user.tenantId, sellerTenantId: field(data, "sellerTenantId"), actorUserId: user.id, reason: field(data, "reason") });
  revalidatePath("/app/requisition-to-order/banking-verification");
}
