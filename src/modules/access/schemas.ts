import { z } from "zod";

export const assignableRoles = [
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
] as const;

export const inviteMemberSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  name: z.string().trim().min(2).max(160),
  jobTitle: z.string().trim().max(160).optional(),
  employeeId: z.string().trim().max(80).optional(),
  temporaryPassword: z.string().min(12).max(128),
  roles: z.array(z.enum(assignableRoles)).min(1),
  approvalLimitUsd: z.coerce.number().min(0).max(1_000_000_000).optional(),
  legalEntityScopeIds: z.array(z.string().min(1)),
  siteScopeIds: z.array(z.string().min(1)),
  departmentScopeIds: z.array(z.string().min(1)),
});

export const updateMembershipSchema = inviteMemberSchema.omit({
  email: true,
  name: true,
  temporaryPassword: true,
}).extend({
  membershipId: z.string().min(1),
  status: z.enum(["INVITED", "ACTIVE", "SUSPENDED", "REVOKED"]),
});
