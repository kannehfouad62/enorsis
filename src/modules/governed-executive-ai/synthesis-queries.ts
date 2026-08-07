import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getExecutiveSynthesisWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;

  const [syntheses, runs] = await Promise.all([
    prisma.executiveSynthesis.findMany({
      where: { tenantId },
      include: { synthesisRun: true },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.executiveSynthesisRun.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  return { syntheses, runs };
}
