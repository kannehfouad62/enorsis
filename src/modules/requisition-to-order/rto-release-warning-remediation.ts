import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  getRtoAssurancePriorityQueue,
} from "./assurance-priority-queries";
import {
  getRtoSlaWorkspace,
} from "./rto-sla-queries";

export async function getRtoReleaseWarningRemediation() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [sla, priority] = await Promise.all([
    getRtoSlaWorkspace(),
    getRtoAssurancePriorityQueue(),
  ]);

  const slaWarnings = sla.items
    .filter((item) =>
      ["WARNING", "BREACHED", "CRITICAL_BREACH"].includes(
        item.status,
      ),
    )
    .map((item) => ({
      key: `${item.type}:${item.id}`,
      journeyId: item.journeyId,
      type: item.type,
      journeyNumber: item.journeyNumber,
      title: item.title,
      state: item.status,
      ageHours: item.ageHours,
      ownerUserId: item.ownerUserId,
      severity: item.severity,
      remediationUrl:
        item.type === "APPROVAL"
          ? "/app/requisition-to-order"
          : "/app/requisition-to-order/assurance",
      guidance:
        item.type === "APPROVAL"
          ? "Complete or reassign the pending approval decision."
          : "Investigate, assign, resolve, or dismiss the governed exception.",
    }));

  const overdueJourneys = priority.queue
    .filter((item) => item.overdue)
    .map((item) => ({
      id: item.id,
      journeyNumber: item.journeyNumber,
      title: item.title,
      status: item.status,
      priority: item.priority,
      score: item.score,
      activeExceptions: item.activeExceptions,
      pendingApprovals: item.pendingApprovals,
      missingPaymentReadiness:
        item.missingPaymentReadiness,
      remediationUrl:
        "/app/requisition-to-order/assurance",
      guidance:
        "Review the required-by date and either complete the downstream work, update the demand date through the governed workflow, or close/cancel the journey when appropriate.",
    }));

  return {
    generatedAt: new Date().toISOString(),
    slaWarnings,
    overdueJourneys,
    summary: {
      slaWarnings: slaWarnings.length,
      breached: slaWarnings.filter(
        (item) => item.state === "BREACHED",
      ).length,
      criticalBreaches: slaWarnings.filter(
        (item) =>
          item.state === "CRITICAL_BREACH",
      ).length,
      warnings: slaWarnings.filter(
        (item) => item.state === "WARNING",
      ).length,
      overdueJourneys: overdueJourneys.length,
      totalRemediationItems:
        slaWarnings.length +
        overdueJourneys.length,
    },
  };
}
