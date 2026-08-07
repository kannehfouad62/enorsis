import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureExecutiveBoardPackDefinitions } from "@/core/executive-board-reporting/definitions";

export async function getExecutiveBoardReportingWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  await ensureExecutiveBoardPackDefinitions(tenantId);

  const [definitions, packs] = await Promise.all([
    prisma.executiveBoardPackDefinition.findMany({
      where: {
        tenantId,
        active: true,
      },
      orderBy: [{ packType: "asc" }, { name: "asc" }],
    }),
    prisma.executiveBoardPack.findMany({
      where: { tenantId },
      include: { definition: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return { definitions, packs };
}
