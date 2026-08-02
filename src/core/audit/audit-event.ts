import { z } from "zod";

export const auditEventInputSchema = z.object({
  tenantId: z.string().min(1).nullable(),
  userId: z.string().min(1).nullable(),
  actorType: z.enum(["USER", "SYSTEM", "AI_AGENT", "INTEGRATION"]),
  actorId: z.string().min(1).nullable().optional(),
  actorLabel: z.string().min(1).nullable().optional(),
  action: z.string().min(3).max(160),
  resourceType: z.string().min(2).max(120),
  resourceId: z.string().min(1).nullable().optional(),
  outcome: z.enum(["SUCCESS", "FAILURE", "DENIED", "PARTIAL"]).default("SUCCESS"),
  reason: z.string().max(1000).nullable().optional(),
  requestId: z.string().max(200).nullable().optional(),
  ipAddress: z.string().max(100).nullable().optional(),
  userAgent: z.string().max(1000).nullable().optional(),
  before: z.unknown().nullable().optional(),
  after: z.unknown().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type AuditEventInput = z.infer<typeof auditEventInputSchema>;

/**
 * Audit events are append-only business records.
 *
 * Application services may create events, but must never expose update or
 * delete operations for existing events.
 */
export function createAuditEventInput(
  input: AuditEventInput,
): AuditEventInput {
  return auditEventInputSchema.parse(input);
}
