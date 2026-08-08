import { prisma } from "@/lib/prisma";

type MatchRequirement = {
  tenantId: string;
  category?: string | null;
  country?: string | null;
  capabilities: string[];
  certifications: string[];
  preferredCurrency?: string | null;
  maxLeadTimeDays?: number | null;
  verificationRequired: boolean;
};

const asStrings = (value: unknown) =>
  Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

const normalized = (value: string) =>
  value.trim().toLowerCase();

const overlapScore = (
  required: string[],
  available: string[],
) => {
  if (required.length === 0) return 100;

  const haystack = available.map(normalized);
  const hits = required.filter((item) => {
    const needle = normalized(item);
    return haystack.some(
      (candidate) =>
        candidate.includes(needle) ||
        needle.includes(candidate),
    );
  }).length;

  return (hits / required.length) * 100;
};

const clamp = (value: number) =>
  Math.max(0, Math.min(100, value));

const rounded = (value: number) =>
  Math.round(value * 100) / 100;

export async function rankMarketplaceSuppliers(
  requirement: MatchRequirement,
) {
  const profiles =
    await prisma.supplierMarketplaceProfile.findMany({
      where: {
        tenantId: requirement.tenantId,
        marketplaceVisible: true,
        ...(requirement.verificationRequired
          ? { verificationStatus: "VERIFIED" }
          : {
              verificationStatus: {
                not: "SUSPENDED",
              },
            }),
      },
      orderBy: { marketplaceScore: "desc" },
      take: 1000,
    });

  const supplierIds = profiles.map(
    (profile) => profile.supplierId,
  );

  const [suppliers, offerings, ratings] =
    await Promise.all([
      prisma.supplier.findMany({
        where: {
          tenantId: requirement.tenantId,
          id: { in: supplierIds },
        },
        select: {
          id: true,
          supplierNumber: true,
          legalName: true,
          tradingName: true,
          riskTier: true,
          qualificationStatus: true,
        },
      }),
      prisma.supplierMarketplaceOffering.findMany({
        where: {
          tenantId: requirement.tenantId,
          supplierId: { in: supplierIds },
          marketplaceVisible: true,
        },
      }),
      prisma.supplierMarketplaceRating.findMany({
        where: {
          tenantId: requirement.tenantId,
          supplierId: { in: supplierIds },
          status: "PUBLISHED",
        },
        select: {
          supplierId: true,
          overallRating: true,
        },
      }),
    ]);

  const supplierMap = new Map(
    suppliers.map((supplier) => [
      supplier.id,
      supplier,
    ]),
  );

  const offeringMap = new Map<
    string,
    typeof offerings
  >();

  for (const offering of offerings) {
    const items =
      offeringMap.get(offering.supplierId) ?? [];
    items.push(offering);
    offeringMap.set(offering.supplierId, items);
  }

  const ratingMap = new Map<string, number[]>();

  for (const rating of ratings) {
    const values =
      ratingMap.get(rating.supplierId) ?? [];
    values.push(Number(rating.overallRating));
    ratingMap.set(rating.supplierId, values);
  }

  const results = profiles
    .map((profile) => {
      const supplier = supplierMap.get(
        profile.supplierId,
      );

      if (!supplier) return null;

      const industries = asStrings(profile.industries);
      const categories = asStrings(profile.categories);
      const capabilities = asStrings(
        profile.capabilities,
      );
      const certifications = asStrings(
        profile.certifications,
      );
      const countries = [
        profile.headquartersCountry ?? "",
        ...asStrings(profile.countriesServed),
      ].filter(Boolean);

      const supplierOfferings =
        offeringMap.get(profile.supplierId) ?? [];

      const offeringCategories = supplierOfferings
        .flatMap((item) => [
          item.category ?? "",
          item.subcategory ?? "",
        ])
        .filter(Boolean);

      const offeringKeywords = supplierOfferings
        .flatMap((item) => asStrings(item.keywords));

      const categoryScore = requirement.category
        ? overlapScore(
            [requirement.category],
            [
              ...categories,
              ...industries,
              ...offeringCategories,
              ...offeringKeywords,
            ],
          )
        : 100;

      const capabilityFit = overlapScore(
        requirement.capabilities,
        [
          ...capabilities,
          ...offeringKeywords,
          ...offeringCategories,
        ],
      );

      const certificationFit = overlapScore(
        requirement.certifications,
        certifications,
      );

      const capabilityScore = rounded(
        categoryScore * 0.4 +
          capabilityFit * 0.45 +
          certificationFit * 0.15,
      );

      const geographyScore = requirement.country
        ? overlapScore(
            [requirement.country],
            countries,
          )
        : 100;

      const ratingValues =
        ratingMap.get(profile.supplierId) ?? [];

      const averageRating =
        ratingValues.length === 0
          ? null
          : ratingValues.reduce(
              (sum, value) => sum + value,
              0,
            ) / ratingValues.length;

      const ratingTrust =
        averageRating === null
          ? 50
          : (averageRating / 5) * 100;

      const verificationTrust =
        profile.verificationStatus === "VERIFIED"
          ? 100
          : profile.verificationStatus === "PENDING"
            ? 55
            : 35;

      const trustScore = rounded(
        ratingTrust * 0.55 +
          verificationTrust * 0.45,
      );

      const performanceScore = rounded(
        profile.performanceScore === null
          ? 50
          : Number(profile.performanceScore),
      );

      const riskScore = rounded(
        profile.riskScore === null
          ? 50
          : clamp(100 - Number(profile.riskScore)),
      );

      const matchingOfferings =
        supplierOfferings.filter((offering) => {
          const categoryOk = requirement.category
            ? [
                offering.category ?? "",
                offering.subcategory ?? "",
                ...asStrings(offering.keywords),
              ]
                .join(" ")
                .toLowerCase()
                .includes(
                  requirement.category.toLowerCase(),
                )
            : true;

          const currencyOk =
            requirement.preferredCurrency
              ? offering.currencyCode ===
                requirement.preferredCurrency
              : true;

          const leadTimeOk =
            requirement.maxLeadTimeDays === null ||
            requirement.maxLeadTimeDays === undefined
              ? true
              : offering.leadTimeDays === null ||
                offering.leadTimeDays <=
                  requirement.maxLeadTimeDays;

          return (
            categoryOk &&
            currencyOk &&
            leadTimeOk &&
            offering.availabilityStatus !==
              "UNAVAILABLE"
          );
        });

      const catalogScore = rounded(
        supplierOfferings.length === 0
          ? 35
          : clamp(
              40 +
                Math.min(
                  60,
                  matchingOfferings.length * 20,
                ),
            ),
      );

      const totalScore = rounded(
        capabilityScore * 0.3 +
          geographyScore * 0.12 +
          trustScore * 0.18 +
          performanceScore * 0.15 +
          riskScore * 0.15 +
          catalogScore * 0.1,
      );

      return {
        supplier,
        profile,
        totalScore,
        capabilityScore,
        geographyScore,
        trustScore,
        performanceScore,
        riskScore,
        catalogScore,
        evidence: {
          matchedCapabilities: requirement.capabilities.filter(
            (required) =>
              overlapScore(
                [required],
                [
                  ...capabilities,
                  ...offeringKeywords,
                  ...offeringCategories,
                ],
              ) > 0,
          ),
          requiredCapabilities:
            requirement.capabilities,
          certifications,
          countries,
          matchingOfferingCount:
            matchingOfferings.length,
          totalOfferingCount:
            supplierOfferings.length,
          verificationStatus:
            profile.verificationStatus,
          averageRating:
            averageRating === null
              ? null
              : rounded(averageRating),
          ratingCount: ratingValues.length,
          marketplaceScore:
            profile.marketplaceScore === null
              ? null
              : Number(profile.marketplaceScore),
          qualificationStatus:
            supplier.qualificationStatus,
          riskTier: supplier.riskTier,
        },
      };
    })
    .filter(
      (
        item,
      ): item is NonNullable<typeof item> =>
        item !== null,
    )
    .sort(
      (left, right) =>
        right.totalScore - left.totalScore,
    );

  return results.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}
