import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  getRtoAuditEvidence,
} from "./rto-audit-evidence-queries";
import {
  getRtoExecutiveAssuranceAnalytics,
} from "./rto-executive-assurance-analytics";
import {
  getRtoPolicyGovernance,
} from "./rto-policy-governance-queries";

type GateStatus =
  | "PASSED"
  | "WARNING"
  | "BLOCKED";

export async function getRtoProductionCertification() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [executive, audit, policies] =
    await Promise.all([
      getRtoExecutiveAssuranceAnalytics(),
      getRtoAuditEvidence(),
      getRtoPolicyGovernance(),
    ]);

  const gates: Array<{
    key: string;
    name: string;
    status: GateStatus;
    evidence: string;
    blocker: boolean;
  }> = [];

  const push = (
    key: string,
    name: string,
    status: GateStatus,
    evidence: string,
    blocker: boolean,
  ) => {
    gates.push({
      key,
      name,
      status,
      evidence,
      blocker,
    });
  };

  push(
    "CONTROL_HEALTH",
    "Overall control health",
    executive.controlHealth === "CRITICAL"
      ? "BLOCKED"
      : executive.controlHealth === "AT_RISK"
        ? "WARNING"
        : "PASSED",
    `Current control health: ${executive.controlHealth}.`,
    executive.controlHealth === "CRITICAL",
  );

  push(
    "SLA_COMPLIANCE",
    "SLA compliance",
    executive.metrics.criticalSlaBreaches > 0
      ? "BLOCKED"
      : executive.metrics.slaComplianceRate < 95
        ? "WARNING"
        : "PASSED",
    `${executive.metrics.slaComplianceRate.toFixed(
      1,
    )}% compliance · ${executive.metrics.criticalSlaBreaches} critical breaches.`,
    executive.metrics.criticalSlaBreaches > 0,
  );

  push(
    "EXCEPTION_CONTROL",
    "Open exception control",
    executive.metrics.openExceptions > 0
      ? "WARNING"
      : "PASSED",
    `${executive.metrics.openExceptions} open governed exceptions.`,
    false,
  );

  push(
    "OWNERSHIP",
    "Control ownership",
    executive.metrics.unownedControls > 0
      ? "WARNING"
      : "PASSED",
    `${executive.metrics.unownedControls} unowned SLA controls.`,
    false,
  );

  push(
    "ESCALATION_DELIVERY",
    "Escalation delivery",
    executive.escalationSummary.deliveryFailures > 0
      ? "BLOCKED"
      : "PASSED",
    `${executive.escalationSummary.deliveryFailures} escalation delivery failures.`,
    executive.escalationSummary.deliveryFailures > 0,
  );

  push(
    "ESCALATION_ACKNOWLEDGMENT",
    "Escalation acknowledgment",
    executive.metrics.unacknowledgedEscalations > 0
      ? "WARNING"
      : "PASSED",
    `${executive.metrics.unacknowledgedEscalations} unacknowledged escalations.`,
    false,
  );

  push(
    "AUDIT_EVIDENCE",
    "Audit evidence availability",
    audit.totals.journeys > 0 &&
    audit.totals.activities > 0
      ? "PASSED"
      : "BLOCKED",
    `${audit.totals.journeys} journeys · ${audit.totals.activities} activity records · ${audit.totals.milestones} milestones.`,
    !(
      audit.totals.journeys > 0 &&
      audit.totals.activities > 0
    ),
  );

  push(
    "POLICY_INITIALIZATION",
    "Policy catalog initialization",
    policies.summary.codeDefaults > 0
      ? "BLOCKED"
      : "PASSED",
    `${policies.summary.initialized}/${policies.summary.total} policies initialized · ${policies.summary.tenantOverrides} tenant overrides.`,
    policies.summary.codeDefaults > 0,
  );

  push(
    "HIGH_RISK_JOURNEYS",
    "Critical journey exposure",
    executive.metrics.criticalJourneys > 0
      ? "BLOCKED"
      : executive.metrics.highRiskJourneys > 0
        ? "WARNING"
        : "PASSED",
    `${executive.metrics.criticalJourneys} critical · ${executive.metrics.highRiskJourneys} high-risk journeys.`,
    executive.metrics.criticalJourneys > 0,
  );

  push(
    "OVERDUE_JOURNEYS",
    "Overdue journey exposure",
    executive.metrics.overdueJourneys > 0
      ? "WARNING"
      : "PASSED",
    `${executive.metrics.overdueJourneys} overdue journeys.`,
    false,
  );

  const blockers = gates.filter(
    (gate) => gate.blocker,
  );

  const warnings = gates.filter(
    (gate) => gate.status === "WARNING",
  );

  const readiness =
    blockers.length > 0
      ? "BLOCKED"
      : warnings.length > 0
        ? "READY_WITH_WARNINGS"
        : "CERTIFIED_READY";

  return {
    generatedAt: new Date().toISOString(),
    readiness,
    gates,
    summary: {
      total: gates.length,
      passed: gates.filter(
        (gate) => gate.status === "PASSED",
      ).length,
      warnings: warnings.length,
      blocked: blockers.length,
    },
  };
}
