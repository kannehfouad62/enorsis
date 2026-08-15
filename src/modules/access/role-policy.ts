import type { TenantCommercialPersonaValue } from "@/core/tenancy/commercial-persona";
import { assignableRoles } from "./schemas";

export type AssignableRole = (typeof assignableRoles)[number];

const supplierRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "SUPPLIER_MANAGER",
  "FINANCE",
  "LEGAL",
  "RISK_COMPLIANCE",
  "AUDITOR",
  "VIEWER",
] as const satisfies readonly AssignableRole[];

const buyerRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "REQUESTER",
  "APPROVER",
  "FINANCE",
  "LEGAL",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
  "AUDITOR",
  "VIEWER",
] as const satisfies readonly AssignableRole[];

export function getAssignableRolesForPersona(
  persona: TenantCommercialPersonaValue,
): readonly AssignableRole[] {
  if (persona === "SUPPLIER") return supplierRoles;
  if (persona === "BUYER") return buyerRoles;
  return assignableRoles;
}

export function assertRolesAllowedForPersona(
  persona: TenantCommercialPersonaValue,
  roles: readonly string[],
) {
  const allowed = new Set<string>(getAssignableRolesForPersona(persona));
  const invalid = roles.filter((role) => !allowed.has(role));

  if (invalid.length > 0) {
    throw new Error(
      `The following roles are not permitted for a ${persona.toLowerCase().replaceAll("_", " ")} tenant: ${invalid.join(", ")}.`,
    );
  }
}
