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

const asArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string",
      )
    : [];

function normalizeProductIdentity(
  value: string | null | undefined,
) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

function productFamilyKey(offering: {
  offeringType: string;
  name: string;
  category: string | null;
  brand: string | null;
  manufacturer: string | null;
  modelNumber: string | null;
  unitOfMeasure: string | null;
}) {
  const type = offering.offeringType.toLowerCase();

  if (offering.modelNumber) {
    const maker =
      offering.brand ||
      offering.manufacturer ||
      offering.name;

    return [
      type,
      normalizeProductIdentity(maker),
      normalizeProductIdentity(
        offering.modelNumber,
      ),
    ].join(":");
  }

  return [
    type,
    normalizeProductIdentity(offering.name),
    normalizeProductIdentity(
      offering.category,
    ),
    normalizeProductIdentity(
      offering.unitOfMeasure,
    ),
  ].join(":");
}

export async function getMarketplaceCatalog(input: {
  q?: string;
  category?: string;
  type?: string;
  availability?: string;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!session.user.roles.some((role) => roles.has(role))) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;
  const q = input.q?.trim().toLowerCase() ?? "";
  const category =
    input.category?.trim().toLowerCase() ?? "";
  const type = input.type?.trim() ?? "";
  const availability =
    input.availability?.trim() ?? "";

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { commercialPersona: true },
  });

  const commercialPersona =
    tenant?.commercialPersona ?? "BUYER";
  const isSupplierOnly =
    commercialPersona === "SUPPLIER";
  const canManageCatalog =
    commercialPersona === "SUPPLIER" ||
    commercialPersona === "BUYER_SUPPLIER";

  const suppliers = await prisma.supplier.findMany({
    where: { tenantId },
    select: {
      id: true,
      supplierNumber: true,
      legalName: true,
      tradingName: true,
    },
    orderBy: { legalName: "asc" },
    take: 1000,
  });

  const offerings =
    await prisma.supplierMarketplaceOffering.findMany({
      where: {
        ...(isSupplierOnly
          ? { tenantId }
          : { marketplaceVisible: true }),
        ...(type
          ? { offeringType: type }
          : {}),
        ...(availability
          ? {
              availabilityStatus:
                availability,
            }
          : {}),
      },
      orderBy: [
        { featured: "desc" },
        { updatedAt: "desc" },
      ],
      take: 1000,
    });

  const marketplaceSuppliers = offerings.length
    ? await prisma.supplier.findMany({
        where: {
          id: {
            in: [
              ...new Set(
                offerings.map(
                  (offering) =>
                    offering.supplierId,
                ),
              ),
            ],
          },
        },
        select: {
          id: true,
          supplierNumber: true,
          legalName: true,
          tradingName: true,
        },
      })
    : [];

  const media = offerings.length
    ? await prisma.supplierMarketplaceOfferingMedia.findMany({
        where: {
          offeringId: {
            in: offerings.map(
              (offering) => offering.id,
            ),
          },
        },
        orderBy: [
          { isPrimary: "desc" },
          { position: "asc" },
          { createdAt: "asc" },
        ],
      })
    : [];

  const mediaByOffering = new Map<
    string,
    typeof media
  >();

  for (const item of media) {
    const current =
      mediaByOffering.get(
        item.offeringId,
      ) ?? [];
    current.push(item);
    mediaByOffering.set(
      item.offeringId,
      current,
    );
  }

  const supplierMap = new Map(
    marketplaceSuppliers.map((supplier) => [
      supplier.id,
      supplier,
    ]),
  );

  const results = offerings
    .map((offering) => {
      const supplier = supplierMap.get(
        offering.supplierId,
      );
      if (!supplier) return null;

      const keywords = asArray(
        offering.keywords,
      );
      const countries = asArray(
        offering.countriesAvailable,
      );
      const certifications = asArray(
        offering.certifications,
      );

      const searchable = [
        offering.name,
        offering.sku ?? "",
        offering.category ?? "",
        offering.subcategory ?? "",
        offering.brand ?? "",
        offering.manufacturer ?? "",
        offering.modelNumber ?? "",
        offering.shortDescription ?? "",
        offering.description ?? "",
        supplier.legalName,
        supplier.tradingName ?? "",
        supplier.supplierNumber,
        ...keywords,
        ...countries,
        ...certifications,
      ]
        .join(" ")
        .toLowerCase();

      const searchTokens = q
        .split(/\s+/)
        .filter(Boolean);

      if (
        searchTokens.length > 0 &&
        !searchTokens.every((token) =>
          searchable.includes(token),
        )
      ) {
        return null;
      }

      if (
        category &&
        ![
          offering.category ?? "",
          offering.subcategory ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(category)
      ) {
        return null;
      }

      return {
        offering,
        supplier,
        keywords,
        countries,
        certifications,
        media:
          mediaByOffering.get(
            offering.id,
          ) ?? [],
      };
    })
    .filter(
      (
        result,
      ): result is NonNullable<
        typeof result
      > => result !== null,
    );

  const groupMap = new Map<
    string,
    typeof results
  >();

  for (const result of results) {
    const key = productFamilyKey(
      result.offering,
    );
    const current =
      groupMap.get(key) ?? [];
    current.push(result);
    groupMap.set(key, current);
  }

  const comparisonGroups = [
    ...groupMap.entries(),
  ]
    .map(([key, offers]) => {
      const sortedOffers = [
        ...offers,
      ].sort((left, right) => {
        const leftPrice =
          left.offering.unitPrice == null
            ? Number.POSITIVE_INFINITY
            : Number(
                left.offering.unitPrice,
              );
        const rightPrice =
          right.offering.unitPrice ==
          null
            ? Number.POSITIVE_INFINITY
            : Number(
                right.offering.unitPrice,
              );

        if (leftPrice !== rightPrice) {
          return leftPrice - rightPrice;
        }

        const leftLead =
          left.offering.leadTimeDays ??
          Number.POSITIVE_INFINITY;
        const rightLead =
          right.offering.leadTimeDays ??
          Number.POSITIVE_INFINITY;

        if (leftLead !== rightLead) {
          return leftLead - rightLead;
        }

        return (
          left.supplier.tradingName ??
          left.supplier.legalName
        ).localeCompare(
          right.supplier.tradingName ??
            right.supplier.legalName,
        );
      });

      const representative =
        sortedOffers.find(
          (offer) =>
            offer.offering.featured,
        ) ?? sortedOffers[0];

      const priced = sortedOffers
        .map((offer) =>
          offer.offering.unitPrice ==
          null
            ? null
            : Number(
                offer.offering.unitPrice,
              ),
        )
        .filter(
          (value): value is number =>
            value !== null &&
            Number.isFinite(value),
        );

      const leadTimes = sortedOffers
        .map(
          (offer) =>
            offer.offering
              .leadTimeDays,
        )
        .filter(
          (value): value is number =>
            value !== null &&
            value !== undefined,
        );

      return {
        key,
        representative,
        offers: sortedOffers,
        supplierCount: new Set(
          sortedOffers.map(
            (offer) =>
              offer.supplier.id,
          ),
        ).size,
        fromPrice:
          priced.length > 0
            ? Math.min(...priced)
            : null,
        bestLeadTimeDays:
          leadTimes.length > 0
            ? Math.min(
                ...leadTimes,
              )
            : null,
      };
    })
    .sort((left, right) => {
      if (
        left.representative.offering
          .featured !==
        right.representative.offering
          .featured
      ) {
        return left.representative
          .offering.featured
          ? -1
          : 1;
      }

      return (
        right.supplierCount -
        left.supplierCount
      );
    });

  return {
    commercialPersona,
    canManageCatalog,
    suppliers,
    results,
    managementResults:
      results.filter(
        (result) =>
          result.offering.tenantId ===
          tenantId,
      ),
    comparisonGroups,
  };
}
