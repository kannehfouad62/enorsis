export type TenantCommercialPersonaValue =
  | "BUYER"
  | "SUPPLIER"
  | "BUYER_SUPPLIER";

export const TENANT_COMMERCIAL_PERSONAS = [
  "BUYER",
  "SUPPLIER",
  "BUYER_SUPPLIER",
] as const satisfies readonly TenantCommercialPersonaValue[];

const supplierAllowedPrefixes = [
  "/app",
  "/app/modules",
  "/app/activity",
  "/app/notifications",
  "/app/marketplace/catalog",
  "/app/marketplace/trust",
  "/app/supplier-portal",
  "/app/logistics",
  "/app/claims",
  "/app/contracts",
  "/app/sustainability",
  "/app/settings/organization",
  "/app/settings/access",
  "/app/settings/access-governance",
  "/app/settings/security",
  "/app/settings/notifications",
  "/app/settings/integrations",
  "/app/settings/integration-hub",
  "/app/settings/api",
] as const;

const buyerBlockedPrefixes = ["/app/supplier-portal"] as const;

function isSameOrChild(href: string, prefix: string) {
  if (prefix === "/app") return href === "/app";
  return href === prefix || href.startsWith(`${prefix}/`);
}

export function isHrefAllowedForCommercialPersona(
  href: string,
  persona: TenantCommercialPersonaValue,
) {
  if (persona === "BUYER_SUPPLIER") return true;

  if (persona === "BUYER") {
    return !buyerBlockedPrefixes.some((prefix) =>
      isSameOrChild(href, prefix),
    );
  }

  return supplierAllowedPrefixes.some((prefix) =>
    isSameOrChild(href, prefix),
  );
}

export function commercialPersonaLabel(
  persona: TenantCommercialPersonaValue,
) {
  if (persona === "BUYER") return "Buyer";
  if (persona === "SUPPLIER") return "Supplier";
  return "Buyer + Supplier";
}
