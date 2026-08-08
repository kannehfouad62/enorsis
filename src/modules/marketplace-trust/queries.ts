import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const roles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "AUDITOR",
  "VIEWER",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
]);

export async function getMarketplaceTrustWorkspace() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [
    suppliers,
    profiles,
    verifications,
    ratings,
  ] = await Promise.all([
    prisma.supplier.findMany({
      where: { tenantId },
      select: {
        id: true,
        supplierNumber: true,
        legalName: true,
        tradingName: true,
        riskTier: true,
        qualificationStatus: true,
      },
      orderBy: { legalName: "asc" },
      take: 1000,
    }),
    prisma.supplierMarketplaceProfile.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: 1000,
    }),
    prisma.supplierMarketplaceVerification.findMany({
      where: { tenantId },
      orderBy: { requestedAt: "desc" },
      take: 100,
    }),
    prisma.supplierMarketplaceRating.findMany({
      where: {
        tenantId,
        status: "PUBLISHED",
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const supplierMap = new Map(
    suppliers.map((supplier) => [
      supplier.id,
      supplier,
    ]),
  );

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.supplierId,
      profile,
    ]),
  );

  const ratingGroups = new Map<
    string,
    typeof ratings
  >();

  for (const item of ratings) {
    const current =
      ratingGroups.get(item.supplierId) ?? [];
    current.push(item);
    ratingGroups.set(item.supplierId, current);
  }

  const trustPortfolio = suppliers.map((supplier) => {
    const supplierRatings =
      ratingGroups.get(supplier.id) ?? [];
    const average =
      supplierRatings.length === 0
        ? null
        : supplierRatings.reduce(
            (sum, item) =>
              sum + Number(item.overallRating),
            0,
          ) / supplierRatings.length;

    return {
      supplier,
      profile: profileMap.get(supplier.id) ?? null,
      ratingCount: supplierRatings.length,
      averageRating: average,
    };
  });

  return {
    suppliers,
    trustPortfolio,
    verifications: verifications.map((item) => ({
      ...item,
      supplier:
        supplierMap.get(item.supplierId) ?? null,
    })),
    ratings: ratings.map((item) => ({
      ...item,
      supplier:
        supplierMap.get(item.supplierId) ?? null,
    })),
  };
}
