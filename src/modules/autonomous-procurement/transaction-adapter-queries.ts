import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAdapterDefinition } from "@/core/autonomous-procurement/transaction-adapters";

const roles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "FINANCE",
  "RISK_COMPLIANCE",
  "SUPPLIER_MANAGER",
  "AUDITOR",
  "VIEWER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
]);

export async function getTransactionAdapterWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [handoffs, jobs] = await Promise.all([
    prisma.autonomousExecutionHandoff.findMany({
      where: {
        tenantId,
        status: "READY_FOR_HANDOFF",
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.autonomousExecutionAdapterJob.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const existingHandoffs = new Set(
    jobs.map((job) => job.executionHandoffId),
  );

  return {
    availableHandoffs: handoffs
      .filter(
        (handoff) =>
          !existingHandoffs.has(handoff.id) &&
          getAdapterDefinition(
            handoff.targetWorkflow,
          ) !== null,
      )
      .map((handoff) => ({
        ...handoff,
        adapter: getAdapterDefinition(
          handoff.targetWorkflow,
        ),
      })),
    jobs,
    latestJob: jobs[0] ?? null,
    metrics: {
      jobs: jobs.length,
      draftReady: jobs.filter(
        (job) => job.status === "DRAFT_READY",
      ).length,
      activated: jobs.filter(
        (job) => job.status === "OPERATOR_ACTIVATED",
      ).length,
      completed: jobs.filter(
        (job) => job.status === "COMPLETED",
      ).length,
    },
  };
}
