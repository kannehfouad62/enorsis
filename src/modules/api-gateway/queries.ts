import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getApiGatewayWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [clients, logs] = await Promise.all([
    prisma.apiClient.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        credentials: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.apiRequestLog.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return { clients, logs };
}
