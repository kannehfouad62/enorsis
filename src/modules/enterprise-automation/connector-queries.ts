import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getAutomationConnectorRegistry() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const connectors =
    await prisma.enterpriseAutomationConnector.findMany({
      where: {
        tenantId: session.user.tenantId,
      },
      orderBy: [
        { status: "asc" },
        { name: "asc" },
      ],
    });

  return { connectors };
}
