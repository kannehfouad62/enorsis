import { prisma } from "@/lib/prisma";

const rounded = (value: number) =>
  Math.round(value * 100) / 100;

export async function recalculateMarketplaceTrust(
  tenantId: string,
  supplierId: string,
) {
  const [profile, ratings, activeVerification] =
    await Promise.all([
      prisma.supplierMarketplaceProfile.findFirst({
        where: { tenantId, supplierId },
      }),
      prisma.supplierMarketplaceRating.findMany({
        where: {
          tenantId,
          supplierId,
          status: "PUBLISHED",
        },
        select: {
          overallRating: true,
          qualityRating: true,
          deliveryRating: true,
          serviceRating: true,
          valueRating: true,
          complianceRating: true,
        },
      }),
      prisma.supplierMarketplaceVerification.findFirst({
        where: {
          tenantId,
          supplierId,
          status: "VERIFIED",
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
        orderBy: { reviewedAt: "desc" },
      }),
    ]);

  if (!profile) {
    return {
      ratingCount: ratings.length,
      averageRating: null,
      verificationStatus: "UNVERIFIED",
    };
  }

  const values = ratings.map((rating) =>
    Number(rating.overallRating),
  );

  const averageRating =
    values.length > 0
      ? rounded(
          values.reduce((sum, value) => sum + value, 0) /
            values.length,
        )
      : null;

  const performanceScore =
    averageRating === null
      ? profile.performanceScore
      : rounded((averageRating / 5) * 100);

  const verificationStatus = activeVerification
    ? "VERIFIED"
    : profile.verificationStatus === "SUSPENDED"
      ? "SUSPENDED"
      : "UNVERIFIED";

  const verificationBoost =
    verificationStatus === "VERIFIED" ? 10 : 0;

  const performance =
    performanceScore === null
      ? 0
      : Number(performanceScore);

  const quality =
    profile.qualityScore === null
      ? performance
      : Number(profile.qualityScore);

  const risk =
    profile.riskScore === null
      ? 50
      : Number(profile.riskScore);

  const marketplaceScore = rounded(
    Math.max(
      0,
      Math.min(
        100,
        performance * 0.45 +
          quality * 0.25 +
          (100 - risk) * 0.2 +
          verificationBoost,
      ),
    ),
  );

  await prisma.supplierMarketplaceProfile.update({
    where: { id: profile.id },
    data: {
      verificationStatus,
      verifiedAt:
        verificationStatus === "VERIFIED"
          ? activeVerification?.reviewedAt ?? new Date()
          : null,
      verifiedByUserId:
        verificationStatus === "VERIFIED"
          ? activeVerification?.reviewedByUserId ?? null
          : null,
      performanceScore,
      marketplaceScore,
    },
  });

  return {
    ratingCount: ratings.length,
    averageRating,
    performanceScore,
    marketplaceScore,
    verificationStatus,
  };
}
