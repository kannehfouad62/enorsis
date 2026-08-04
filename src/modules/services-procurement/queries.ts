import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getServicesWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;
  const [sows, suppliers, members, timeEntries] = await Promise.all([
    prisma.statementOfWork.findMany({
      where: { tenantId },
      include: {
        supplier: true,
        milestones: true,
        workers: true,
        timeEntries: true,
      },
      orderBy: [{ status: "asc" }, { startsAt: "desc" }],
      take: 100,
    }),
    prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { legalName: "asc" },
    }),
    prisma.membership.findMany({
      where: { tenantId, status: "ACTIVE" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.serviceTimeEntry.findMany({
      where: { tenantId },
      include: {
        worker: true,
        statementOfWork: true,
      },
      orderBy: { workDate: "desc" },
      take: 100,
    }),
  ]);

  return {
    sows,
    suppliers,
    members,
    timeEntries,
    metrics: {
      activeSows: sows.filter((sow) => sow.status === "ACTIVE").length,
      activeWorkers: sows.reduce(
        (sum, sow) =>
          sum + sow.workers.filter((worker) => worker.status === "ACTIVE").length,
        0,
      ),
      committedValue: sows.reduce(
        (sum, sow) => sum + Number(sow.notToExceedAmount),
        0,
      ),
      pendingTime: timeEntries.filter((entry) => entry.status === "SUBMITTED")
        .length,
      approvedTimeValue: timeEntries
        .filter((entry) => entry.status === "APPROVED")
        .reduce((sum, entry) => sum + Number(entry.amount), 0),
    },
  };
}
