import {
  getRequisitionLifecycleAssurance,
} from "./lifecycle-assurance-queries";
import {
  getRtoAssurancePriorityQueue,
} from "./assurance-priority-queries";
import {
  getRtoEscalationAssuranceWorkspace,
} from "./rto-escalation-assurance-queries";
import {
  getRtoSlaWorkspace,
} from "./rto-sla-queries";

export async function getRtoExecutiveAssuranceAnalytics() {
  const [lifecycle, priority, sla, escalations] =
    await Promise.all([
      getRequisitionLifecycleAssurance(),
      getRtoAssurancePriorityQueue(),
      getRtoSlaWorkspace(),
      getRtoEscalationAssuranceWorkspace(),
    ]);

  const breachedControls =
    sla.summary.criticalBreaches +
    sla.summary.breached;

  const evaluatedControls =
    sla.summary.total;

  const slaComplianceRate =
    evaluatedControls > 0
      ? ((evaluatedControls - breachedControls) /
          evaluatedControls) *
        100
      : 100;

  const acknowledgmentRate =
    escalations.summary.total > 0
      ? (escalations.summary.acknowledged /
          escalations.summary.total) *
        100
      : 100;

  const deliverySuccessRate =
    escalations.summary.total > 0
      ? (escalations.summary.delivered /
          escalations.summary.total) *
        100
      : 100;

  const lifecycleAssuranceRate =
    lifecycle.summary.total > 0
      ? (lifecycle.summary.assured /
          lifecycle.summary.total) *
        100
      : 100;

  const highRiskJourneys =
    priority.queue
      .filter((item) =>
        ["CRITICAL", "HIGH"].includes(item.priority),
      )
      .slice(0, 20);

  const controlHealth =
    sla.summary.criticalBreaches > 0 ||
    priority.summary.critical > 0
      ? "CRITICAL"
      : sla.summary.breached > 0 ||
          priority.summary.high > 0
        ? "AT_RISK"
        : sla.summary.warning > 0 ||
            priority.summary.medium > 0
          ? "ATTENTION"
          : "ASSURED";

  return {
    generatedAt: new Date().toISOString(),
    controlHealth,
    metrics: {
      lifecycleAssuranceRate,
      slaComplianceRate,
      acknowledgmentRate,
      deliverySuccessRate,
      criticalSlaBreaches:
        sla.summary.criticalBreaches,
      openExceptions:
        sla.summary.openExceptions,
      unownedControls:
        sla.summary.unowned,
      overdueJourneys:
        priority.summary.overdue,
      criticalJourneys:
        priority.summary.critical,
      highRiskJourneys:
        priority.summary.high,
      unacknowledgedEscalations:
        escalations.summary.unacknowledged,
      averageEscalationAgeHours:
        escalations.summary.averageAgeHours,
    },
    highRiskJourneys,
    lifecycleSummary: lifecycle.summary,
    slaSummary: sla.summary,
    escalationSummary: escalations.summary,
  };
}
