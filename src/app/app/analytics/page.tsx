import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  Building2,
  CircleDollarSign,
  FileClock,
  Gavel,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { HorizontalBars } from "@/components/analytics/HorizontalBars";
import {
  formatMoney,
  getProcurementCommandCenter,
} from "@/modules/analytics/procurement";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ProcurementAnalyticsPage() {
  const data = await getProcurementCommandCenter();
  const { metrics } = data;

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6 xl:px-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Enterprise intelligence
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Procurement Command Center
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Unified visibility across requests, sourcing, suppliers, contracts,
            risk and governed AI activity for {data.tenant.name}.
          </p>
        </div>
        <Link
          href="/app/agents/executive"
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          Generate executive AI brief
        </Link>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={CircleDollarSign}
          label="Approved demand"
          value={formatMoney(metrics.approvedSpendUsd, "USD")}
          detail={`${formatMoney(metrics.pipelineSpendUsd, "USD")} in pipeline`}
        />
        <Metric
          icon={Building2}
          label="Active contract value"
          value={formatMoney(metrics.activeContractValue, data.tenant.baseCurrencyCode)}
          detail={`${metrics.activeContracts} active contracts`}
        />
        <Metric
          icon={Gavel}
          label="Competitive sourcing"
          value={`${metrics.competitiveEvents}/${metrics.sourcingEvents}`}
          detail={`${metrics.averageBidParticipation.toFixed(1)} average bids per event`}
        />
        <Metric
          icon={Bot}
          label="Governed AI adoption"
          value={`${metrics.acceptedAi}/${metrics.completedAi}`}
          detail={`${metrics.aiExecutions} recorded executions`}
        />
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={FileClock}
          label="Renewal exposure"
          value={String(metrics.expiringContracts)}
          detail="Contracts ending within 120 days"
        />
        <Metric
          icon={ShieldAlert}
          label="High-risk suppliers"
          value={String(metrics.highRiskSuppliers)}
          detail={`${metrics.totalSuppliers} total suppliers`}
        />
        <Metric
          icon={AlertTriangle}
          label="Expired evidence"
          value={String(metrics.suppliersWithExpiredEvidence)}
          detail="Suppliers requiring compliance action"
        />
        <Metric
          icon={Sparkles}
          label="Approved suppliers"
          value={String(metrics.approvedSuppliers)}
          detail={`${metrics.totalSuppliers} in the supplier portfolio`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Top spend categories</h2>
          <p className="mt-2 text-sm text-slate-500">
            Purchase-request demand normalized to USD.
          </p>
          <div className="mt-6">
            <HorizontalBars
              data={data.categoryBreakdown.map((item) => ({
                label: item.category,
                value: item.value,
              }))}
              valueFormatter={(value) => formatMoney(value, "USD")}
            />
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Supplier contract exposure</h2>
          <p className="mt-2 text-sm text-slate-500">
            Active and approved contract values by supplier.
          </p>
          <div className="mt-6">
            <HorizontalBars
              data={data.supplierExposure.map((supplier) => ({
                label: supplier.name,
                value: supplier.value,
                detail: `${supplier.riskTier} risk`,
              }))}
              valueFormatter={(value) =>
                formatMoney(value, data.tenant.baseCurrencyCode)
              }
            />
          </div>
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Savings opportunity radar</h2>
            <p className="mt-2 text-sm text-slate-500">
              Deterministic hypotheses derived from recorded demand and
              concentration—not autonomous savings claims.
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
            Human validation required
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {data.savingsOpportunities.map((opportunity) => (
            <article
              key={`${opportunity.type}-${opportunity.title}`}
              className="rounded-2xl bg-slate-50 p-5"
            >
              <p className="text-xs font-black uppercase tracking-[.14em] text-blue-700">
                {opportunity.type.replaceAll("_", " ")}
              </p>
              <h3 className="mt-2 font-black">{opportunity.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {opportunity.description}
              </p>
              <p className="mt-4 font-black text-emerald-700">
                Indicative opportunity:{" "}
                {formatMoney(opportunity.potentialUsd, "USD")}
              </p>
            </article>
          ))}

          {data.savingsOpportunities.length === 0 ? (
            <p className="text-sm text-slate-500">
              More purchasing and contract data is required to identify
              opportunities.
            </p>
          ) : null}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Upcoming contract renewals</h2>
          <div className="mt-5 space-y-3">
            {data.expiringContracts.slice(0, 6).map((contract) => (
              <Link
                key={contract.id}
                href={`/app/contracts/${contract.id}`}
                className="block rounded-2xl bg-slate-50 p-4"
              >
                <p className="font-black">{contract.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {contract.supplier.tradingName ??
                    contract.supplier.legalName}{" "}
                  · {contract.endDate?.toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">High-risk supplier watchlist</h2>
          <div className="mt-5 space-y-3">
            {data.highRiskSuppliers.slice(0, 6).map((supplier) => (
              <Link
                key={supplier.id}
                href={`/app/suppliers/${supplier.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
              >
                <div>
                  <p className="font-black">
                    {supplier.tradingName ?? supplier.legalName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {supplier.countryCode} · {supplier.qualificationStatus}
                  </p>
                </div>
                <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                  {supplier.riskTier}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className={card}>
      <Icon className="h-5 w-5 text-blue-700" />
      <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </article>
  );
}
