import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getAiWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const executions = await prisma.aiExecution.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return { session, executions };
}
