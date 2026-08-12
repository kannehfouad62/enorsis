export type TenantRoleAuditSeverity = "PASS" | "WARN" | "FAIL";

export type TenantRoleAuditFinding = {
  code: string;
  severity: TenantRoleAuditSeverity;
  message: string;
};

export type TenantRoleAuditMember = {
  userId: string;
  email: string | null;
  name: string | null;
  status: string;
  roles: string[];
  hasPassword: boolean;
};

export type TenantRoleAuditResult = {
  userId: string;
  email: string | null;
  name: string | null;
  status: string;
  roles: string[];
  severity: TenantRoleAuditSeverity;
  findings: TenantRoleAuditFinding[];
};

const PLATFORM_ONLY_ROLES = new Set([
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
]);

const SUPPLIER_PERSONA_BUYER_ROLES = new Set([
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "REQUESTER",
  "APPROVER",
  "FINANCE",
]);

const BUYER_PERSONA_SUPPLIER_ROLES = new Set([
  "SUPPLIER_MANAGER",
]);

function highestSeverity(
  findings: TenantRoleAuditFinding[],
): TenantRoleAuditSeverity {
  if (findings.some((finding) => finding.severity === "FAIL")) {
    return "FAIL";
  }

  if (findings.some((finding) => finding.severity === "WARN")) {
    return "WARN";
  }

  return "PASS";
}

export function auditTenantMemberAccess(input: {
  commercialPersona: string;
  member: TenantRoleAuditMember;
}): TenantRoleAuditResult {
  const { member, commercialPersona } = input;
  const findings: TenantRoleAuditFinding[] = [];

  if (member.roles.length === 0) {
    findings.push({
      code: "NO_ROLES",
      severity: "FAIL",
      message:
        "No tenant access role is assigned. Assign at least one role before activation.",
    });
  }

  const platformRoles = member.roles.filter((role) =>
    PLATFORM_ONLY_ROLES.has(role),
  );

  if (platformRoles.length > 0) {
    findings.push({
      code: "PLATFORM_ROLE_IN_TENANT",
      severity: "FAIL",
      message:
        `Platform-only role${platformRoles.length === 1 ? "" : "s"} ${platformRoles.join(", ")} should not be granted through a tenant membership.`,
    });
  }

  if (
    member.status === "ACTIVE" &&
    !member.hasPassword
  ) {
    findings.push({
      code: "ACTIVE_WITHOUT_CREDENTIALS",
      severity: "WARN",
      message:
        "Membership is ACTIVE but the user has not configured login credentials.",
    });
  }

  if (
    member.status === "INVITED" &&
    member.hasPassword
  ) {
    findings.push({
      code: "INVITED_WITH_CREDENTIALS",
      severity: "WARN",
      message:
        "User already has credentials but the membership remains INVITED.",
    });
  }

  if (commercialPersona === "SUPPLIER") {
    const mismatched = member.roles.filter((role) =>
      SUPPLIER_PERSONA_BUYER_ROLES.has(role),
    );

    if (mismatched.length > 0) {
      findings.push({
        code: "SUPPLIER_PERSONA_BUYER_ROLE",
        severity: "WARN",
        message:
          `Supplier-only tenant member has buyer/procurement role${mismatched.length === 1 ? "" : "s"}: ${mismatched.join(", ")}. Confirm this exception is intentional.`,
      });
    }
  }

  if (commercialPersona === "BUYER") {
    const mismatched = member.roles.filter((role) =>
      BUYER_PERSONA_SUPPLIER_ROLES.has(role),
    );

    if (mismatched.length > 0) {
      findings.push({
        code: "BUYER_PERSONA_SUPPLIER_ROLE",
        severity: "WARN",
        message:
          `Buyer-only tenant member has supplier role${mismatched.length === 1 ? "" : "s"}: ${mismatched.join(", ")}. Confirm this exception is intentional.`,
      });
    }
  }

  if (findings.length === 0) {
    findings.push({
      code: "ACCESS_POSTURE_OK",
      severity: "PASS",
      message:
        "Assigned roles and credential posture are consistent with current tenant access rules.",
    });
  }

  return {
    userId: member.userId,
    email: member.email,
    name: member.name,
    status: member.status,
    roles: member.roles,
    severity: highestSeverity(findings),
    findings,
  };
}

export function auditTenantAccess(input: {
  commercialPersona: string;
  members: TenantRoleAuditMember[];
}) {
  const results = input.members.map((member) =>
    auditTenantMemberAccess({
      commercialPersona: input.commercialPersona,
      member,
    }),
  );

  return {
    results,
    passed: results.filter((item) => item.severity === "PASS").length,
    warnings: results.filter((item) => item.severity === "WARN").length,
    failed: results.filter((item) => item.severity === "FAIL").length,
    reviewed: results.length,
  };
}
