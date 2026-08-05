import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getSupplierClaimsWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = session.user.tenantId;
  const [claims, suppliers] = await Promise.all([
    prisma.supplierClaim.findMany({
      where: { tenantId },
      include: {
        supplier: true,
        evidence: true,
        recoveries: true,
      },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 200,
    }),
    prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { legalName: "asc" },
    }),
  ]);

  const now = new Date();

  return {
    claims,
    suppliers,
    metrics: {
      open: claims.filter((claim) =>
        ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "PARTIALLY_ACCEPTED"]
          .includes(claim.status),
      ).length,
      overdue: claims.filter(
        (claim) =>
          claim.dueAt &&
          claim.dueAt < now &&
          !["SETTLED", "CLOSED", "CANCELLED"].includes(claim.status),
      ).length,
      claimed: claims.reduce(
        (sum, claim) => sum + Number(claim.claimedAmount),
        0,
      ),
      accepted: claims.reduce(
        (sum, claim) => sum + Number(claim.acceptedAmount),
        0,
      ),
      settled: claims.reduce(
        (sum, claim) => sum + Number(claim.settledAmount),
        0,
      ),
      pendingRecovery: claims.reduce(
        (sum, claim) =>
          sum +
          claim.recoveries
            .filter((recovery) =>
              ["PROPOSED", "AGREED", "ISSUED"].includes(recovery.status),
            )
            .reduce((inner, recovery) => inner + Number(recovery.amount), 0),
        0,
      ),
    },
  };
}
