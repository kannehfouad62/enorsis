import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getAssetsWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;
  const [assets, members] = await Promise.all([
    prisma.procurementAsset.findMany({
      where: { tenantId },
      include: {
        assignments: {
          where: { status: "ACTIVE" },
          orderBy: { assignedAt: "desc" },
        },
        maintenancePlans: true,
        maintenanceRecords: {
          orderBy: { scheduledAt: "desc" },
          take: 20,
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      take: 250,
    }),
    prisma.membership.findMany({
      where: { tenantId, status: "ACTIVE" },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const now = new Date();

  return {
    assets,
    members,
    metrics: {
      inService: assets.filter((asset) => asset.status === "IN_SERVICE").length,
      maintenance: assets.filter(
        (asset) => asset.status === "UNDER_MAINTENANCE",
      ).length,
      assetValue: assets.reduce(
        (sum, asset) => sum + Number(asset.purchaseCost ?? 0),
        0,
      ),
      warrantyExpiring: assets.filter(
        (asset) =>
          asset.warrantyEndsAt &&
          asset.warrantyEndsAt >= now &&
          asset.warrantyEndsAt <= new Date(now.getTime() + 90 * 86400000),
      ).length,
      maintenanceDue: assets.reduce(
        (sum, asset) =>
          sum +
          asset.maintenancePlans.filter(
            (plan) => plan.active && plan.nextDueAt <= now,
          ).length,
        0,
      ),
      unassigned: assets.filter(
        (asset) =>
          asset.status === "IN_SERVICE" &&
          asset.assignments.length === 0,
      ).length,
    },
  };
}
