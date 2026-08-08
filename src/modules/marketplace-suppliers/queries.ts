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
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
]);

const asArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

export async function getMarketplaceSupplierDiscovery(
  searchParams: {
    q?: string;
    country?: string;
    industry?: string;
    category?: string;
    verification?: string;
  },
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;
  const q = searchParams.q?.trim().toLowerCase() ?? "";
  const country =
    searchParams.country?.trim().toLowerCase() ?? "";
  const industry =
    searchParams.industry?.trim().toLowerCase() ?? "";
  const category =
    searchParams.category?.trim().toLowerCase() ?? "";
  const verification =
    searchParams.verification?.trim() ?? "";

  const [suppliers, profiles] = await Promise.all([
    prisma.supplier.findMany({
      where: { tenantId },
      select: {
        id: true,
        supplierNumber: true,
        legalName: true,
        tradingName: true,
        status: true,
        riskTier: true,
        qualificationStatus: true,
      },
      orderBy: { legalName: "asc" },
      take: 1000,
    }),
    prisma.supplierMarketplaceProfile.findMany({
      where: {
        tenantId,
        marketplaceVisible: true,
        ...(verification
          ? { verificationStatus: verification }
          : {}),
      },
      orderBy: [
        { marketplaceScore: "desc" },
        { updatedAt: "desc" },
      ],
      take: 1000,
    }),
  ]);

  const supplierMap = new Map(
    suppliers.map((supplier) => [supplier.id, supplier]),
  );

  const results = profiles
    .map((profile) => {
      const supplier = supplierMap.get(profile.supplierId);
      if (!supplier) return null;

      const industries = asArray(profile.industries);
      const categories = asArray(profile.categories);
      const capabilities = asArray(profile.capabilities);
      const keywords = asArray(profile.keywords);
      const countriesServed = asArray(
        profile.countriesServed,
      );

      const searchable = [
        supplier.legalName,
        supplier.tradingName ?? "",
        supplier.supplierNumber,
        profile.headline ?? "",
        profile.description ?? "",
        profile.headquartersCountry ?? "",
        ...industries,
        ...categories,
        ...capabilities,
        ...keywords,
        ...countriesServed,
      ]
        .join(" ")
        .toLowerCase();

      if (q && !searchable.includes(q)) return null;
      if (
        country &&
        ![
          profile.headquartersCountry ?? "",
          ...countriesServed,
        ]
          .join(" ")
          .toLowerCase()
          .includes(country)
      ) {
        return null;
      }
      if (
        industry &&
        !industries
          .join(" ")
          .toLowerCase()
          .includes(industry)
      ) {
        return null;
      }
      if (
        category &&
        !categories
          .join(" ")
          .toLowerCase()
          .includes(category)
      ) {
        return null;
      }

      return {
        profile,
        supplier,
        industries,
        categories,
        capabilities,
        countriesServed,
        certifications: asArray(profile.certifications),
        sustainabilityTags: asArray(
          profile.sustainabilityTags,
        ),
        diversityTags: asArray(profile.diversityTags),
      };
    })
    .filter(Boolean);

  return {
    session,
    suppliers,
    results,
  };
}
