import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const permittedRoles = new Set([
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_AUDITOR",
]);

export async function getRc1Workspace() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (
    !session.user.roles.some((role) => permittedRoles.has(role))
  ) {
    redirect("/app/unauthorized");
  }

  const since = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  );

  const [
    latestCertification,
    activeAutomationConnectors,
    automationCircuitRisks,
    integrationConnections,
    integrationErrors,
    recentFailedSyncs,
    aiExecutions,
    aiFailures,
    workflowInstances,
    escalatedWorkflowTasks,
    auditEvents,
    activeTenants,
  ] = await Promise.all([
    prisma.platformCertificationRun.findFirst({
      include: {
        checks: {
          orderBy: [
            { category: "asc" },
            { name: "asc" },
          ],
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.enterpriseAutomationConnector.count({
      where: { status: "ACTIVE" },
    }),
    prisma.enterpriseAutomationConnector.count({
      where: {
        status: "ACTIVE",
        consecutiveFailures: { gte: 5 },
      },
    }),
    prisma.enterpriseConnectorConnection.count({
      where: { status: "ACTIVE" },
    }),
    prisma.enterpriseConnectorConnection.count({
      where: { status: "ERROR" },
    }),
    prisma.enterpriseIntegrationSyncRun.count({
      where: {
        status: "FAILED",
        createdAt: { gte: since },
      },
    }),
    prisma.aiExecution.count({
      where: { createdAt: { gte: since } },
    }),
    prisma.aiExecution.count({
      where: {
        status: "FAILED",
        createdAt: { gte: since },
      },
    }),
    prisma.workflowInstance.count(),
    prisma.workflowTask.count({
      where: { status: "ESCALATED" },
    }),
    prisma.auditEvent.count({
      where: { occurredAt: { gte: since } },
    }),
    prisma.tenant.count({
      where: { status: "ACTIVE" },
    }),
  ]);

  const certificationSummary =
    latestCertification?.checks.reduce(
      (summary, check) => {
        summary.total += 1;

        if (check.status === "PASS") {
          summary.passed += 1;
        } else if (check.status === "WARN") {
          summary.warnings += 1;
        } else {
          summary.failed += 1;
        }

        if (
          check.status === "FAIL" &&
          check.releaseBlocking
        ) {
          summary.blockers += 1;
        }

        return summary;
      },
      {
        total: 0,
        passed: 0,
        warnings: 0,
        failed: 0,
        blockers: 0,
      },
    ) ?? {
      total: 0,
      passed: 0,
      warnings: 0,
      failed: 0,
      blockers: 0,
    };

  const gates = [
    {
      key: "platform-certification",
      label: "Platform certification",
      status: !latestCertification
        ? "NOT_RUN"
        : latestCertification.releaseBlocked
          ? "BLOCKED"
          : latestCertification.certifiedAt
            ? "CERTIFIED"
            : "ELIGIBLE",
      detail: latestCertification
        ? `${latestCertification.status} · ${certificationSummary.passed}/${certificationSummary.total} checks passing`
        : "No certification run exists.",
    },
    {
      key: "automation",
      label: "Automation runtime",
      status:
        automationCircuitRisks === 0
          ? "READY"
          : "ATTENTION",
      detail: `${activeAutomationConnectors} active connectors · ${automationCircuitRisks} at circuit threshold`,
    },
    {
      key: "integrations",
      label: "Enterprise Integration Hub",
      status:
        integrationErrors === 0 &&
        recentFailedSyncs === 0
          ? "READY"
          : "ATTENTION",
      detail: `${integrationConnections} active connections · ${integrationErrors} error connections · ${recentFailedSyncs} failed syncs/24h`,
    },
    {
      key: "ai-governance",
      label: "Governed AI",
      status:
        aiFailures === 0 ? "READY" : "ATTENTION",
      detail: `${aiExecutions} executions/24h · ${aiFailures} failed`,
    },
    {
      key: "workflows",
      label: "Workflow operations",
      status:
        escalatedWorkflowTasks === 0
          ? "READY"
          : "ATTENTION",
      detail: `${workflowInstances} process instances · ${escalatedWorkflowTasks} escalated tasks`,
    },
    {
      key: "audit",
      label: "Audit telemetry",
      status: "READY",
      detail: `${auditEvents} audit events recorded in the last 24 hours`,
    },
  ] as const;

  const blockers = gates.filter(
    (gate) => gate.status === "BLOCKED",
  ).length;
  const attention = gates.filter(
    (gate) => gate.status === "ATTENTION",
  ).length;

  return {
    latestCertification,
    certificationSummary,
    gates,
    blockers,
    attention,
    activeTenants,
    analyzedAt: new Date(),
  };
}
