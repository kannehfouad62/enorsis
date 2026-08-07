import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureExecutiveBoardPackDefinitions } from "@/core/executive-board-reporting/definitions";

export async function getExecutiveBoardCalendarWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  await ensureExecutiveBoardPackDefinitions(tenantId);

  const [definitions, schedules, runs] = await Promise.all([
    prisma.executiveBoardPackDefinition.findMany({
      where: {
        tenantId,
        active: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.executiveBoardReportSchedule.findMany({
      where: { tenantId },
      include: {
        definition: true,
      },
      orderBy: [
        { status: "asc" },
        { nextRunAt: "asc" },
      ],
      take: 100,
    }),
    prisma.executiveBoardReportScheduleRun.findMany({
      where: { tenantId },
      include: {
        schedule: {
          include: {
            definition: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    definitions,
    schedules,
    runs,
  };
}
