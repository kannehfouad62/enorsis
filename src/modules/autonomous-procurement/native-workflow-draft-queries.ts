import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

export async function getNativeWorkflowDraftWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [activatedJobs, drafts] = await Promise.all([
    prisma.autonomousExecutionAdapterJob.findMany({
      where: {
        tenantId,
        status: "OPERATOR_ACTIVATED",
      },
      orderBy: { activatedAt: "desc" },
      take: 100,
    }),
    prisma.autonomousNativeWorkflowDraft.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const materializedJobs = new Set(
    drafts.map((draft) => draft.adapterJobId),
  );

  return {
    availableJobs: activatedJobs.filter(
      (job) => !materializedJobs.has(job.id),
    ),
    drafts,
    latestDraft: drafts[0] ?? null,
    metrics: {
      total: drafts.length,
      materialized: drafts.filter(
        (draft) => draft.status === "DRAFT_MATERIALIZED",
      ).length,
      opened: drafts.filter(
        (draft) => draft.status === "NATIVE_WORKFLOW_OPENED",
      ).length,
      confirmed: drafts.filter(
        (draft) => draft.status === "NATIVE_DRAFT_CONFIRMED",
      ).length,
    },
  };
}
