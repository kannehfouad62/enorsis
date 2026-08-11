import {
  BadgeDollarSign,
  Clock3,
  PackageSearch,
  Store,
} from "lucide-react";
import { MarketplaceAddToCartButton } from "@/components/marketplace/MarketplaceAddToCartButton";

type CatalogData = Awaited<
  ReturnType<
    typeof import("@/modules/marketplace-catalog/queries").getMarketplaceCatalog
  >
>;

export function MarketplaceComparisonResults({
  groups,
}: {
  groups: CatalogData["comparisonGroups"];
}) {
  if (groups.length === 0) {
    return (
      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <PackageSearch className="mx-auto h-10 w-10 text-slate-300" />
        <h2 className="mt-4 text-lg font-black">
          No marketplace offers found
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Try a broader product name,
          manufacturer, brand, model,
          category or SKU.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">
            Global product search
          </p>
          <h2 className="mt-2 text-2xl font-black">
            Compare supplier offers
          </h2>
        </div>
        <p className="text-sm text-slate-500">
          {groups.length} product/service
          families
        </p>
      </div>

      {groups.map((group) => {
        const representative =
          group.representative;
        const primaryImage =
          representative.media.find(
            (item) => item.isPrimary,
          ) ?? representative.media[0];

        return (
          <article
            key={group.key}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
              <div className="bg-slate-50 p-5">
                <div className="aspect-square rounded-2xl bg-white">
                  {primaryImage ? (
                    <img
                      src={`/api/marketplace/catalog/media/${primaryImage.id}`}
                      alt={
                        primaryImage.altText ??
                        representative.offering
                          .name
                      }
                      className="h-full w-full object-contain p-4"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                      <PackageSearch className="h-14 w-14" />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                      {representative.offering
                        .brand ??
                        representative.offering
                          .manufacturer ??
                        representative.offering
                          .category ??
                        "Marketplace product"}
                    </p>
                    <h3 className="mt-2 text-2xl font-black">
                      {
                        representative.offering
                          .name
                      }
                    </h3>
                    {representative.offering
                      .modelNumber ? (
                      <p className="mt-1 text-sm text-slate-500">
                        Model{" "}
                        {
                          representative
                            .offering
                            .modelNumber
                        }
                      </p>
                    ) : null}
                  </div>

                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
                    {group.supplierCount}{" "}
                    supplier
                    {group.supplierCount ===
                    1
                      ? ""
                      : "s"}{" "}
                    offering
                    {group.supplierCount ===
                    1
                      ? ""
                      : "s"}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Metric
                    icon={BadgeDollarSign}
                    label="From"
                    value={
                      group.fromPrice ===
                      null
                        ? "Request quote"
                        : `${
                            representative
                              .offering
                              .currencyCode
                          } ${group.fromPrice.toLocaleString()}`
                    }
                  />
                  <Metric
                    icon={Clock3}
                    label="Best lead time"
                    value={
                      group.bestLeadTimeDays ===
                      null
                        ? "Not specified"
                        : `${group.bestLeadTimeDays} days`
                    }
                  />
                  <Metric
                    icon={Store}
                    label="Supplier choice"
                    value={`${group.supplierCount} available`}
                  />
                </div>

                <details className="mt-6 rounded-2xl border border-slate-200">
                  <summary className="cursor-pointer list-none px-5 py-4 text-sm font-black text-blue-700">
                    Compare{" "}
                    {group.supplierCount}{" "}
                    supplier
                    {group.supplierCount ===
                    1
                      ? ""
                      : "s"}{" "}
                    →
                  </summary>

                  <div className="overflow-x-auto border-t border-slate-200">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">
                            Supplier
                          </th>
                          <th className="px-4 py-3">
                            Price
                          </th>
                          <th className="px-4 py-3">
                            MOQ
                          </th>
                          <th className="px-4 py-3">
                            Lead time
                          </th>
                          <th className="px-4 py-3">
                            Availability
                          </th>
                          <th className="px-4 py-3">
                            SKU
                          </th>
                          <th className="px-4 py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.offers.map(
                          (offer) => (
                            <tr
                              key={
                                offer.offering
                                  .id
                              }
                              className="border-t border-slate-100"
                            >
                              <td className="px-4 py-4 font-black">
                                {offer.supplier
                                  .tradingName ??
                                  offer.supplier
                                    .legalName}
                              </td>
                              <td className="px-4 py-4">
                                {offer.offering
                                  .unitPrice ==
                                null
                                  ? "Request quote"
                                  : `${
                                      offer
                                        .offering
                                        .currencyCode
                                    } ${Number(
                                      offer
                                        .offering
                                        .unitPrice,
                                    ).toLocaleString()}`}
                              </td>
                              <td className="px-4 py-4">
                                {offer.offering
                                  .minimumOrderQty ==
                                null
                                  ? "—"
                                  : `${Number(
                                      offer
                                        .offering
                                        .minimumOrderQty,
                                    ).toLocaleString()} ${
                                      offer
                                        .offering
                                        .unitOfMeasure ??
                                      ""
                                    }`}
                              </td>
                              <td className="px-4 py-4">
                                {offer.offering
                                  .leadTimeDays ==
                                null
                                  ? "—"
                                  : `${offer.offering.leadTimeDays} days`}
                              </td>
                              <td className="px-4 py-4">
                                {
                                  offer.offering
                                    .availabilityStatus
                                }
                              </td>
                              <td className="px-4 py-4 text-slate-500">
                                {offer.offering
                                  .sku ?? "—"}
                              </td>
                              <td className="px-4 py-4">
                                {offer.offering.unitPrice != null &&
                                offer.offering.availabilityStatus !== "UNAVAILABLE" ? (
                                  <MarketplaceAddToCartButton
                                    item={{
                                      offeringId: offer.offering.id,
                                      sellerTenantId: offer.offering.tenantId,
                                      sellerSupplierId: offer.offering.supplierId,
                                      supplierName:
                                        offer.supplier.tradingName ??
                                        offer.supplier.legalName,
                                      offeringName: offer.offering.name,
                                      sku: offer.offering.sku,
                                      category: offer.offering.category,
                                      unitOfMeasure: offer.offering.unitOfMeasure ?? "EA",
                                      unitPrice: Number(offer.offering.unitPrice),
                                      currencyCode: offer.offering.currencyCode,
                                      minimumOrderQty:
                                        offer.offering.minimumOrderQty == null
                                          ? null
                                          : Number(offer.offering.minimumOrderQty),
                                      leadTimeDays: offer.offering.leadTimeDays,
                                      imageRef: offer.offering.imageRef,
                                    }}
                                  />
                                ) : (
                                  <span className="text-xs font-semibold text-slate-500">
                                    Request quote
                                  </span>
                                )}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BadgeDollarSign;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-black uppercase">
          {label}
        </span>
      </div>
      <p className="mt-2 font-black">
        {value}
      </p>
    </div>
  );
}
