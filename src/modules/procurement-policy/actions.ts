"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const roles = ["PROCUREMENT_EXECUTIVE", "PROCUREMENT_MANAGER", "RISK_COMPLIANCE", "AUDITOR", "TENANT_ADMIN", "TENANT_OWNER"] as const;

export async function createProcurementPolicyAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  await prisma.procurementPolicy.create({ data: {
    tenantId: user.tenantId, code: field(data, "code"), title: field(data, "title"),
    description: field(data, "description"), version: Number(field(data, "version") || 1),
    effectiveAt: field(data, "effectiveAt") ? new Date(field(data, "effectiveAt")) : null,
    expiresAt: field(data, "expiresAt") ? new Date(field(data, "expiresAt")) : null,
    ownerUserId: user.id,
  }});
  revalidatePath("/app/compliance");
}

export async function addProcurementPolicyRuleAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  const policyId = field(data, "policyId");
  await prisma.procurementPolicy.findFirstOrThrow({ where: { id: policyId, tenantId: user.tenantId } });
  await prisma.procurementPolicyRule.create({ data: {
    procurementPolicyId: policyId, key: field(data, "key"), name: field(data, "name"),
    description: field(data, "description") || null,
    type: field(data, "type") as "APPROVAL_LIMIT" | "COMPETITIVE_BIDDING" | "CONTRACT_REQUIRED" | "PREFERRED_SUPPLIER" | "DOCUMENT_REQUIRED" | "SEGREGATION_OF_DUTIES" | "SPEND_THRESHOLD" | "COUNTRY_RESTRICTION" | "CATEGORY_RESTRICTION" | "CUSTOM",
    isBlocking: data.get("isBlocking") === "on", severity: Number(field(data, "severity") || 3),
    resourceType: field(data, "resourceType") || null,
    requiredEvidence: field(data, "requiredEvidence").split(",").map((value) => value.trim()).filter(Boolean),
    remediationGuidance: field(data, "remediationGuidance") || null,
  }});
  revalidatePath("/app/compliance");
}

export async function activateProcurementPolicyAction(data: FormData) {
  const user = await requireAnyRole(["PROCUREMENT_EXECUTIVE", "TENANT_ADMIN", "TENANT_OWNER"]);
  const id = field(data, "policyId");
  const policy = await prisma.procurementPolicy.findFirstOrThrow({ where: { id, tenantId: user.tenantId, status: "DRAFT" } });
  await prisma.procurementPolicy.update({ where: { id: policy.id }, data: { status: "ACTIVE", approvedByUserId: user.id, approvedAt: new Date(), effectiveAt: policy.effectiveAt ?? new Date() } });
  revalidatePath("/app/compliance");
}

export async function createComplianceTestAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  await prisma.procurementComplianceTest.create({ data: {
    tenantId: user.tenantId, name: field(data, "name"), description: field(data, "description") || null,
    periodStart: new Date(field(data, "periodStart")), periodEnd: new Date(field(data, "periodEnd")),
    ownerUserId: user.id, sampleSize: Number(field(data, "sampleSize") || 0), methodology: field(data, "methodology"), status: "IN_PROGRESS",
  }});
  revalidatePath("/app/compliance");
}

export async function createProcurementRemediationAction(data: FormData) {
  const user = await requireAnyRole([...roles]);
  await prisma.procurementRemediation.create({ data: {
    tenantId: user.tenantId, complianceTestId: field(data, "complianceTestId") || null,
    title: field(data, "title"), description: field(data, "description"), severity: Number(field(data, "severity") || 3),
    ownerUserId: field(data, "ownerUserId") || user.id, dueAt: new Date(field(data, "dueAt")),
  }});
  revalidatePath("/app/compliance");
}
