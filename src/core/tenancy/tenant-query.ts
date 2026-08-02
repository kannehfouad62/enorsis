import type { TenantContext } from "./tenant-context";

type TenantScopedWhere = {
  tenantId?: string;
  AND?: unknown[];
  [key: string]: unknown;
};

/**
 * Adds the active tenant to a Prisma-style where clause.
 *
 * This helper is intentionally explicit. Enorsis repositories and services
 * must never accept a tenantId from a browser form and trust it directly.
 */
export function withTenant<TWhere extends TenantScopedWhere>(
  context: TenantContext,
  where?: TWhere,
): TWhere & { tenantId: string } {
  if (where?.tenantId && where.tenantId !== context.tenantId) {
    throw new Error("A query attempted to override the active tenant.");
  }

  return {
    ...(where ?? ({} as TWhere)),
    tenantId: context.tenantId,
  };
}

/**
 * Produces tenant ownership data for create operations.
 */
export function tenantOwnership(
  context: TenantContext,
): { tenantId: string } {
  return {
    tenantId: context.tenantId,
  };
}
