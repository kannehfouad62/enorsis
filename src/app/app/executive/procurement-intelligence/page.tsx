import { refreshProcurementIntelligenceAction } from "@/modules/procurement-intelligence/actions";
import { getProcurementIntelligenceWorkspace } from "@/modules/procurement-intelligence/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function number(value: number, digits = 2) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

type ProcurementIntelligenceWorkspace =
  Awaited<ReturnType<typeof getProcurementIntelligenceWorkspace>>;

type AgedApproval =
  ProcurementIntelligenceWorkspace["agedApprovals"][number];

export default async function ProcurementIntelligencePage() {
  const data = await getProcurementIntelligenceWorkspace();

  const metrics = [
    ["Procurement Health", `${data.summary.procurementHealthScore}/100`],
    ["PO Value", `$${number(data.summary.totalPoValue)}`],
    ["Purchase Request Cycle", `${number(data.summary.requisitionCycleHours)} hrs`],
    ["Approval Cycle", `${number(data.summary.approvalCycleHours)} hrs`],
    ["PO Cycle", `${number(data.summary.purchaseOrderCycleHours)} hrs`],
    ["Contract Coverage", `${number(data.summary.contractCoverage)}%`],
    ["Savings Realization", `${number(data.summary.savingsRealizationRate)}%`],
    ["Invoice Match Rate", `${number(data.summary.invoiceMatchRate)}%`],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="mt-3 text-4xl font-black">
            Procurement Intelligence
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Purchase-request efficiency, approvals, spend, contracts, savings,
            supplier concentration, invoice matching and procurement health.
          </p>
        </div>

        <form action={refreshProcurementIntelligenceAction}>
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Refresh & publish KPIs
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <article key={label} className={card}>
            <p className="text-xs font-black uppercase text-slate-500">
              {label}
            </p>
            <p className="mt-3 text-3xl font-black">{value}</p>
          </article>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Procurement workload</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              ["Purchase requests", data.summary.purchaseRequestCount],
              ["Purchase orders", data.summary.purchaseOrderCount],
              ["Pending approvals", data.summary.pendingApprovalSteps],
              ["Aged approvals", data.summary.agedApprovalSteps],
              ["Active contracts", data.summary.activeContracts],
              ["Active suppliers", data.summary.activeSuppliers],
              ["Invoice value", `$${number(data.summary.totalInvoiceValue)}`],
              ["Supplier concentration", `${number(data.summary.supplierConcentration)}%`],
            ].map(([label, value]) => (
              <article key={String(label)} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-black">{value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Value realization</h2>
          <div className="mt-5 space-y-3">
            <article className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Target savings</p>
              <p className="mt-2 text-2xl font-black">
                ${number(data.summary.identifiedSavings)}
              </p>
            </article>
            <article className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Validated savings</p>
              <p className="mt-2 text-2xl font-black">
                ${number(data.summary.validatedSavings)} ·{" "}
                {number(data.summary.savingsValidationRate)}%
              </p>
            </article>
            <article className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Realized savings</p>
              <p className="mt-2 text-2xl font-black">
                ${number(data.summary.realizedSavings)} ·{" "}
                {number(data.summary.savingsRealizationRate)}%
              </p>
            </article>
            <article className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Invoice-to-PO variance</p>
              <p className="mt-2 text-2xl font-black">
                ${number(data.summary.priceVariance)} ·{" "}
                {number(data.summary.priceVariancePercent)}%
              </p>
            </article>
          </div>
        </section>
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Top suppliers by PO spend</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Supplier</th>
                <th className="px-3 py-3">Spend</th>
                <th className="px-3 py-3">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.topSuppliers.map((supplier) => (
                <tr key={supplier.supplierId}>
                  <td className="px-3 py-3 font-black">
                    {supplier.supplierName}
                  </td>
                  <td className="px-3 py-3">
                    ${number(supplier.spend)}
                  </td>
                  <td className="px-3 py-3">
                    {number(supplier.sharePercent)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Aged approval bottlenecks</h2>
        <div className="mt-5 space-y-3">
          {data.agedApprovals.length === 0 ? (
            <p className="text-sm text-slate-500">
              No approval steps older than 48 hours.
            </p>
          ) : (
            data.agedApprovals.map((step: AgedApproval) => (
              <article key={step.id} className="rounded-xl bg-slate-50 p-4">
                <p className="font-black">{step.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Sequence {step.sequence} · created{" "}
                  {step.createdAt.toLocaleString()}
                </p>
                {step.dueAt ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Due {step.dueAt.toLocaleString()}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
