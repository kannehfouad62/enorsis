import Link from "next/link";
import {
  BadgeCheck,
  ShieldAlert,
  Star,
  StarHalf,
} from "lucide-react";
import {
  createMarketplaceRatingAction,
  decideMarketplaceVerificationAction,
  reinstateMarketplaceSupplierAction,
  requestMarketplaceVerificationAction,
  suspendMarketplaceSupplierAction,
} from "@/modules/marketplace-trust/actions";
import { getMarketplaceTrustWorkspace } from "@/modules/marketplace-trust/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function MarketplaceTrustPage() {
  const data = await getMarketplaceTrustWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B7.3 · Procurement Marketplace
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Verified Supplier Network & Ratings
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Govern supplier verification evidence, trust status,
            suspension and reinstatement while aggregating buyer
            ratings into marketplace trust indicators.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/marketplace/suppliers"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
          >
            Supplier Discovery
          </Link>
          <Link
            href="/app/marketplace/catalog"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Marketplace Catalog
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Metric
          label="Marketplace suppliers"
          value={data.trustPortfolio.filter(
            (item) => item.profile?.marketplaceVisible,
          ).length}
        />
        <Metric
          label="Verified suppliers"
          value={data.trustPortfolio.filter(
            (item) =>
              item.profile?.verificationStatus ===
              "VERIFIED",
          ).length}
        />
        <Metric
          label="Published ratings"
          value={data.ratings.length}
        />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className={card}>
          <BadgeCheck className="h-5 w-5 text-blue-700" />
          <h2 className="mt-3 text-xl font-black">
            Request supplier verification
          </h2>
          <form
            action={requestMarketplaceVerificationAction}
            className="mt-4 grid gap-3"
          >
            <SupplierSelect suppliers={data.suppliers} />
            <select
              className={input}
              name="verificationType"
              defaultValue="STANDARD"
            >
              <option value="STANDARD">
                Standard verification
              </option>
              <option value="ENHANCED">
                Enhanced due diligence
              </option>
              <option value="GOVERNMENT">
                Government/vendor qualification
              </option>
              <option value="STRATEGIC">
                Strategic supplier verification
              </option>
            </select>
            <textarea
              className={`${input} min-h-24`}
              name="evidenceSummary"
              placeholder="Evidence summary"
            />
            <input
              className={input}
              name="evidenceRefs"
              placeholder="Evidence/document references, comma separated"
            />
            <label className="text-xs font-black uppercase text-slate-500">
              Verification expiry
              <input
                className={`${input} mt-2 w-full`}
                name="expiresAt"
                type="datetime-local"
              />
            </label>
            <button className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white">
              Open verification case
            </button>
          </form>
        </div>

        <div className={card}>
          <Star className="h-5 w-5 text-amber-600" />
          <h2 className="mt-3 text-xl font-black">
            Rate marketplace supplier
          </h2>
          <form
            action={createMarketplaceRatingAction}
            className="mt-4 grid gap-3"
          >
            <SupplierSelect suppliers={data.suppliers} />
            <select
              className={input}
              name="ratingType"
              defaultValue="BUYER_REVIEW"
            >
              <option value="BUYER_REVIEW">
                Buyer review
              </option>
              <option value="DELIVERY_REVIEW">
                Delivery review
              </option>
              <option value="CONTRACT_REVIEW">
                Contract review
              </option>
              <option value="SOURCING_REVIEW">
                Sourcing review
              </option>
            </select>
            <div className="grid grid-cols-3 gap-2">
              <RatingField name="overallRating" label="Overall" required />
              <RatingField name="qualityRating" label="Quality" />
              <RatingField name="deliveryRating" label="Delivery" />
              <RatingField name="serviceRating" label="Service" />
              <RatingField name="valueRating" label="Value" />
              <RatingField
                name="complianceRating"
                label="Compliance"
              />
            </div>
            <input
              className={input}
              name="reviewTitle"
              placeholder="Review title"
            />
            <textarea
              className={`${input} min-h-24`}
              name="reviewText"
              placeholder="Review details"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className={input}
                name="contextType"
                placeholder="Context type"
              />
              <input
                className={input}
                name="contextReference"
                placeholder="Context reference"
              />
            </div>
            <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
              Publish rating
            </button>
          </form>
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">
          Marketplace trust portfolio
        </h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">
                  Marketplace score
                </th>
                <th className="px-4 py-3">Governance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.trustPortfolio.map((item) => (
                <tr key={item.supplier.id}>
                  <td className="px-4 py-3">
                    <p className="font-black">
                      {item.supplier.tradingName ??
                        item.supplier.legalName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.supplier.supplierNumber}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {item.profile?.verificationStatus ??
                      "UNVERIFIED"}
                  </td>
                  <td className="px-4 py-3">
                    {item.averageRating === null
                      ? "—"
                      : `${item.averageRating.toFixed(
                          2,
                        )}/5 (${item.ratingCount})`}
                  </td>
                  <td className="px-4 py-3">
                    {item.profile?.marketplaceScore
                      ? Number(
                          item.profile.marketplaceScore,
                        ).toFixed(1)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <form
                        action={
                          suspendMarketplaceSupplierAction
                        }
                      >
                        <input
                          type="hidden"
                          name="supplierId"
                          value={item.supplier.id}
                        />
                        <input
                          type="hidden"
                          name="reason"
                          value="Governance suspension"
                        />
                        <button className="rounded-xl bg-rose-700 px-3 py-2 text-xs font-black text-white">
                          Suspend
                        </button>
                      </form>
                      <form
                        action={
                          reinstateMarketplaceSupplierAction
                        }
                      >
                        <input
                          type="hidden"
                          name="supplierId"
                          value={item.supplier.id}
                        />
                        <button className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black">
                          Reinstate
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className={card}>
          <h2 className="text-xl font-black">
            Verification cases
          </h2>
          <div className="mt-4 space-y-4">
            {data.verifications.map((verification) => (
              <article
                key={verification.id}
                className="rounded-2xl bg-slate-50 p-4"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-blue-700">
                      {verification.verificationType} ·{" "}
                      {verification.status}
                    </p>
                    <h3 className="mt-1 font-black">
                      {verification.supplier
                        ?.tradingName ??
                        verification.supplier
                          ?.legalName ??
                        verification.supplierId}
                    </h3>
                  </div>
                  <ShieldAlert className="h-5 w-5 text-slate-400" />
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {verification.evidenceSummary ??
                    "No evidence summary."}
                </p>
                <form
                  action={
                    decideMarketplaceVerificationAction
                  }
                  className="mt-4 grid gap-2"
                >
                  <input
                    type="hidden"
                    name="verificationId"
                    value={verification.id}
                  />
                  <input
                    className={input}
                    name="reviewerNotes"
                    placeholder="Reviewer notes"
                  />
                  <div className="flex gap-2">
                    <button
                      name="decision"
                      value="VERIFY"
                      className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white"
                    >
                      Verify
                    </button>
                    <button
                      name="decision"
                      value="REJECT"
                      className="rounded-xl bg-rose-700 px-3 py-2 text-xs font-black text-white"
                    >
                      Reject
                    </button>
                  </div>
                </form>
              </article>
            ))}
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center gap-2">
            <StarHalf className="h-5 w-5 text-amber-600" />
            <h2 className="text-xl font-black">
              Recent marketplace ratings
            </h2>
          </div>
          <div className="mt-4 space-y-4">
            {data.ratings.map((rating) => (
              <article
                key={rating.id}
                className="rounded-2xl bg-slate-50 p-4"
              >
                <p className="text-xs font-black uppercase text-amber-700">
                  {Number(
                    rating.overallRating,
                  ).toFixed(2)}
                  /5 · {rating.ratingType}
                </p>
                <h3 className="mt-1 font-black">
                  {rating.supplier?.tradingName ??
                    rating.supplier?.legalName ??
                    rating.supplierId}
                </h3>
                <p className="mt-2 text-sm font-bold">
                  {rating.reviewTitle ?? "Marketplace review"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {rating.reviewText ?? "No written review."}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SupplierSelect({
  suppliers,
}: {
  suppliers: Array<{
    id: string;
    supplierNumber: string;
    legalName: string;
    tradingName: string | null;
  }>;
}) {
  return (
    <select
      className={input}
      name="supplierId"
      required
    >
      <option value="">Select supplier</option>
      {suppliers.map((supplier) => (
        <option
          key={supplier.id}
          value={supplier.id}
        >
          {supplier.tradingName ??
            supplier.legalName}{" "}
          · {supplier.supplierNumber}
        </option>
      ))}
    </select>
  );
}

function RatingField({
  name,
  label,
  required = false,
}: {
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="text-xs font-black text-slate-500">
      {label}
      <input
        className={`${input} mt-1 w-full`}
        name={name}
        type="number"
        min="1"
        max="5"
        step="0.01"
        required={required}
      />
    </label>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className={card}>
      <p className="text-xs font-black uppercase text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}
