import { z } from "zod";

const currencyCode = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());

const countryCode = z
  .string()
  .trim()
  .length(2)
  .transform((value) => value.toUpperCase());

export const createPlatformTenantSchema = z.object({
  name: z.string().trim().min(2).max(160),
  legalName: z.string().trim().min(2).max(200),
  commercialPersona: z.enum(["BUYER", "SUPPLIER", "BUYER_SUPPLIER"]),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and hyphens only.",
    ),
  countryCode,
  defaultLocale: z.string().trim().min(2).max(20).default("en-US"),
  defaultTimeZone: z.string().trim().min(1).max(100).default("UTC"),
  currencyPolicyMode: z.enum([
    "USD_ONLY",
    "USD_WITH_LOCAL_DISPLAY",
    "TENANT_BASE_CURRENCY",
  ]),
  baseCurrencyCode: currencyCode,
  localDisplayCurrency: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .optional(),
  ownerName: z.string().trim().min(2).max(160),
  ownerEmail: z.string().trim().email().transform((value) => value.toLowerCase()),
  activateImmediately: z.boolean().default(true),
});

export const updatePlatformTenantStatusSchema = z.object({
  tenantId: z.string().trim().min(1),
  status: z.enum(["ACTIVE", "SUSPENDED", "PROVISIONING", "ARCHIVED"]),
});

export const assignPlatformTenantOwnerSchema = z.object({
  tenantId: z.string().trim().min(1),
  ownerName: z.string().trim().min(2).max(160),
  ownerEmail: z.string().trim().email().transform((value) => value.toLowerCase()),
});


export const updatePlatformTenantCommercialPersonaSchema = z.object({
  tenantId: z.string().trim().min(1),
  commercialPersona: z.enum(["BUYER", "SUPPLIER", "BUYER_SUPPLIER"]),
});


const tenantAssignableRole = z.enum([
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "REQUESTER",
  "APPROVER",
  "FINANCE",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "AUDITOR",
  "VIEWER",
]);

export const updatePlatformTenantMemberRolesSchema = z.object({
  tenantId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
  roles: z.array(tenantAssignableRole).min(
    1,
    "Assign at least one tenant role before activation.",
  ),
});
