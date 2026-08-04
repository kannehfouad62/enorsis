import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getProcurementReviewsWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const [reviews, members] = await Promise.all([
    prisma.procurementReview.findMany({
      where: { tenantId: session.user.tenantId },
      include: { metrics: true, actions: true },
      orderBy: { meetingAt: "desc" },
      take: 100,
    }),
    prisma.membership.findMany({
      where: { tenantId: session.user.tenantId, status: "ACTIVE" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return { reviews, members };
}

export async function getProcurementReview(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const [review, members] = await Promise.all([
    prisma.procurementReview.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: {
        metrics: { orderBy: [{ category: "asc" }, { name: "asc" }] },
        actions: { orderBy: [{ status: "asc" }, { dueAt: "asc" }] },
      },
    }),
    prisma.membership.findMany({
      where: { tenantId: session.user.tenantId, status: "ACTIVE" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!review) redirect("/app/reviews");
  return { review, members };
}
