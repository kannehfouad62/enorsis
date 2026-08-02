import { z } from "zod";

export const tenantContextSchema = z.object({
  tenantId: z.string().min(1),
  tenantSlug: z.string().min(1),
  userId: z.string().min(1),
  membershipId: z.string().min(1),
  roles: z.array(z.string().min(1)).min(1),
  locale: z.string().min(2).default("en-US"),
  timeZone: z.string().min(1).default("UTC"),
});

export type TenantContext = z.infer<typeof tenantContextSchema>;

export class TenantAccessError extends Error {
  readonly code:
    | "TENANT_CONTEXT_REQUIRED"
    | "TENANT_MISMATCH"
    | "ROLE_REQUIRED";

  constructor(
    code: TenantAccessError["code"],
    message: string,
  ) {
    super(message);
    this.name = "TenantAccessError";
    this.code = code;
  }
}

export function requireTenantContext(
  value: unknown,
): TenantContext {
  const result = tenantContextSchema.safeParse(value);

  if (!result.success) {
    throw new TenantAccessError(
      "TENANT_CONTEXT_REQUIRED",
      "A valid tenant context is required.",
    );
  }

  return result.data;
}

export function assertTenantMatch(
  context: TenantContext,
  resourceTenantId: string,
): void {
  if (context.tenantId !== resourceTenantId) {
    throw new TenantAccessError(
      "TENANT_MISMATCH",
      "The requested resource belongs to another tenant.",
    );
  }
}

export function requireAnyRole(
  context: TenantContext,
  acceptedRoles: readonly string[],
): void {
  const hasRole = context.roles.some((role) => acceptedRoles.includes(role));

  if (!hasRole) {
    throw new TenantAccessError(
      "ROLE_REQUIRED",
      `One of the following roles is required: ${acceptedRoles.join(", ")}.`,
    );
  }
}
