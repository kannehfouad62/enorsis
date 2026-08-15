import "server-only";
import { createEnterpriseNotification } from "@/core/notifications";
import { bankingFingerprint, decryptBankingPayload, encryptBankingPayload } from "@/lib/banking-encryption";
import { prisma } from "@/lib/prisma";

type BankingInput = { accountHolderName: string; bankName: string; bankCountryCode: string; currencyCode: string; accountType?: string; accountNumber: string; routingNumber?: string; swiftBic?: string; iban?: string; };
const last4 = (value?: string) => { const cleaned = value?.replace(/\\s+/g, "") ?? ""; return cleaned ? cleaned.slice(-4) : null; };

export async function upsertSupplierBankingProfile(input: { sellerTenantId: string; actorUserId: string; actorEmail?: string | null; banking: BankingInput; }) {
  const existing = await prisma.supplierBankingProfile.findUnique({ where: { sellerTenantId: input.sellerTenantId } });
  const profile = await prisma.supplierBankingProfile.upsert({
    where: { sellerTenantId: input.sellerTenantId },
    create: {
      sellerTenantId: input.sellerTenantId, status: "SUBMITTED", accountHolderName: input.banking.accountHolderName,
      bankName: input.banking.bankName, bankCountryCode: input.banking.bankCountryCode, currencyCode: input.banking.currencyCode,
      accountType: input.banking.accountType ?? null, accountNumberLast4: last4(input.banking.accountNumber) ?? "0000",
      routingNumberLast4: last4(input.banking.routingNumber), swiftBic: input.banking.swiftBic ?? null, ibanLast4: last4(input.banking.iban),
      encryptedAccountData: encryptBankingPayload({ accountNumber: input.banking.accountNumber, routingNumber: input.banking.routingNumber ?? "", iban: input.banking.iban ?? "" }),
      submittedByUserId: input.actorUserId, submittedAt: new Date(), lastChangedByUserId: input.actorUserId, lastChangedAt: new Date(),
    },
    update: {
      status: "CHANGE_PENDING", accountHolderName: input.banking.accountHolderName, bankName: input.banking.bankName,
      bankCountryCode: input.banking.bankCountryCode, currencyCode: input.banking.currencyCode, accountType: input.banking.accountType ?? null,
      accountNumberLast4: last4(input.banking.accountNumber) ?? "0000", routingNumberLast4: last4(input.banking.routingNumber),
      swiftBic: input.banking.swiftBic ?? null, ibanLast4: last4(input.banking.iban),
      encryptedAccountData: encryptBankingPayload({ accountNumber: input.banking.accountNumber, routingNumber: input.banking.routingNumber ?? "", iban: input.banking.iban ?? "" }),
      submittedByUserId: input.actorUserId, submittedAt: new Date(), lastChangedByUserId: input.actorUserId, lastChangedAt: new Date(),
    },
  });
  if (existing) {
    await prisma.supplierBankingVerification.updateMany({ where: { sellerTenantId: input.sellerTenantId, status: "VERIFIED" }, data: { status: "PENDING", verifiedByUserId: null, verifiedAt: null, rejectionReason: "Supplier banking instructions changed and require re-verification." } });
  }
  await prisma.auditEvent.create({ data: { tenantId: input.sellerTenantId, userId: input.actorUserId, actorType: "USER", actorId: input.actorUserId, actorLabel: input.actorEmail ?? undefined, action: existing ? "supplier_banking.profile.changed" : "supplier_banking.profile.submitted", resourceType: "SupplierBankingProfile", resourceId: profile.id, after: { bankName: profile.bankName, bankCountryCode: profile.bankCountryCode, currencyCode: profile.currencyCode, accountNumberLast4: profile.accountNumberLast4 } } });
  return profile;
}

export async function getSupplierBankingProfileForTenant(sellerTenantId: string) {
  const profile = await prisma.supplierBankingProfile.findUnique({ where: { sellerTenantId } });
  if (!profile) return null;
  return { ...profile, accountNumberMasked: `••••${profile.accountNumberLast4}`, routingNumberMasked: profile.routingNumberLast4 ? `••••${profile.routingNumberLast4}` : null, ibanMasked: profile.ibanLast4 ? `••••${profile.ibanLast4}` : null };
}

export async function getBuyerBankingVerificationQueue(buyerTenantId: string) {
  const links = await prisma.marketplaceSellerOrder.findMany({ where: { buyerTenantId, buyerSupplierId: { not: null } }, select: { sellerTenantId: true, buyerSupplierId: true }, distinct: ["sellerTenantId"] });
  const items = [];
  for (const link of links) {
    if (!link.buyerSupplierId) continue;
    const [profile, supplier, sellerTenant, verification] = await Promise.all([
      prisma.supplierBankingProfile.findUnique({ where: { sellerTenantId: link.sellerTenantId } }),
      prisma.supplier.findUnique({ where: { id: link.buyerSupplierId } }),
      prisma.tenant.findUnique({ where: { id: link.sellerTenantId }, select: { name: true } }),
      prisma.supplierBankingVerification.findUnique({ where: { buyerTenantId_sellerTenantId: { buyerTenantId, sellerTenantId: link.sellerTenantId } } }),
    ]);
    if (profile && supplier) items.push({ profile, supplier, sellerTenant, verification });
  }
  return items;
}

async function reevaluateBankingBlockedCases(input: { buyerTenantId: string; buyerSupplierId: string; actorUserId: string; }) {
  const cases = await prisma.apPaymentReadinessCase.findMany({ where: { tenantId: input.buyerTenantId, supplierId: input.buyerSupplierId, status: "BLOCKED" }, include: { checks: true, holds: true } });
  let released = 0;
  for (const readinessCase of cases) {
    const bankingCheck = readinessCase.checks.find((check) => check.key === "banking.verified");
    if (bankingCheck?.status === "FAIL") await prisma.apPaymentReadinessCheck.update({ where: { id: bankingCheck.id }, data: { status: "PASS", observedValue: "VERIFIED", remediation: null } });
    await prisma.apPaymentHold.updateMany({ where: { readinessCaseId: readinessCase.id, holdType: "BANKING_REVIEW", status: "ACTIVE" }, data: { status: "RELEASED", releasedByUserId: input.actorUserId, releaseReason: "Supplier banking instructions independently verified by Finance/AP.", releasedAt: new Date() } });
    const refreshed = await prisma.apPaymentReadinessCase.findUniqueOrThrow({ where: { id: readinessCase.id }, include: { checks: true, holds: true } });
    const blocked = refreshed.holds.some((hold) => hold.status === "ACTIVE") || refreshed.checks.some((check) => check.releaseBlocking && check.status === "FAIL");
    if (!blocked) { await prisma.apPaymentReadinessCase.update({ where: { id: readinessCase.id }, data: { status: "READY" } }); released += 1; }
  }
  return released;
}

export async function verifySupplierBanking(input: { buyerTenantId: string; sellerTenantId: string; actorUserId: string; actorEmail?: string | null; }) {
  const linked = await prisma.marketplaceSellerOrder.findFirstOrThrow({ where: { buyerTenantId: input.buyerTenantId, sellerTenantId: input.sellerTenantId, buyerSupplierId: { not: null } } });
  if (!linked.buyerSupplierId) throw new Error("Buyer supplier linkage is missing.");
  const profile = await prisma.supplierBankingProfile.findUniqueOrThrow({ where: { sellerTenantId: input.sellerTenantId } });
  const sensitive = decryptBankingPayload(profile.encryptedAccountData);
  const fingerprint = bankingFingerprint({ sellerTenantId: input.sellerTenantId, bankName: profile.bankName, accountNumber: sensitive.accountNumber, routingNumber: sensitive.routingNumber, iban: sensitive.iban, swiftBic: profile.swiftBic ?? undefined });
  const verification = await prisma.supplierBankingVerification.upsert({
    where: { buyerTenantId_sellerTenantId: { buyerTenantId: input.buyerTenantId, sellerTenantId: input.sellerTenantId } },
    create: { buyerTenantId: input.buyerTenantId, sellerTenantId: input.sellerTenantId, buyerSupplierId: linked.buyerSupplierId, bankingProfileId: profile.id, status: "VERIFIED", verifiedByUserId: input.actorUserId, verifiedAt: new Date(), profileFingerprint: fingerprint },
    update: { buyerSupplierId: linked.buyerSupplierId, bankingProfileId: profile.id, status: "VERIFIED", verifiedByUserId: input.actorUserId, verifiedAt: new Date(), rejectedByUserId: null, rejectedAt: null, rejectionReason: null, revokedByUserId: null, revokedAt: null, revocationReason: null, profileFingerprint: fingerprint },
  });
  const released = await reevaluateBankingBlockedCases({ buyerTenantId: input.buyerTenantId, buyerSupplierId: linked.buyerSupplierId, actorUserId: input.actorUserId });
  await prisma.auditEvent.create({ data: { tenantId: input.buyerTenantId, userId: input.actorUserId, actorType: "USER", actorId: input.actorUserId, actorLabel: input.actorEmail ?? undefined, action: "supplier_banking.verification.approved", resourceType: "SupplierBankingVerification", resourceId: verification.id, after: { sellerTenantId: input.sellerTenantId, buyerSupplierId: linked.buyerSupplierId, readinessCasesReleased: released } } });
  const supplierMembers = await prisma.membership.findMany({ where: { tenantId: input.sellerTenantId, status: "ACTIVE", roles: { hasSome: ["TENANT_OWNER", "TENANT_ADMIN", "SUPPLIER_MANAGER"] } }, include: { user: { select: { id: true, email: true } } }, take: 100 });
  await Promise.allSettled(supplierMembers.map((membership) => createEnterpriseNotification({ tenantId: input.sellerTenantId, eventType: "SupplierBanking.Verified", recipientUserId: membership.user.id, recipientAddress: membership.user.email ?? undefined, title: "Banking details verified", message: "Your payment instructions were independently verified by the buyer's Finance/AP team.", actionUrl: "/app/supplier-portal/banking", channels: membership.user.email ? ["IN_APP", "EMAIL"] : ["IN_APP"], priority: "HIGH" })));
  return { verification, released };
}

export async function rejectSupplierBanking(input: { buyerTenantId: string; sellerTenantId: string; actorUserId: string; reason: string; }) {
  const linked = await prisma.marketplaceSellerOrder.findFirstOrThrow({ where: { buyerTenantId: input.buyerTenantId, sellerTenantId: input.sellerTenantId, buyerSupplierId: { not: null } } });
  const profile = await prisma.supplierBankingProfile.findUniqueOrThrow({ where: { sellerTenantId: input.sellerTenantId } });
  return prisma.supplierBankingVerification.upsert({
    where: { buyerTenantId_sellerTenantId: { buyerTenantId: input.buyerTenantId, sellerTenantId: input.sellerTenantId } },
    create: { buyerTenantId: input.buyerTenantId, sellerTenantId: input.sellerTenantId, buyerSupplierId: linked.buyerSupplierId!, bankingProfileId: profile.id, status: "REJECTED", rejectedByUserId: input.actorUserId, rejectedAt: new Date(), rejectionReason: input.reason, profileFingerprint: "REJECTED" },
    update: { status: "REJECTED", rejectedByUserId: input.actorUserId, rejectedAt: new Date(), rejectionReason: input.reason, verifiedByUserId: null, verifiedAt: null },
  });
}
