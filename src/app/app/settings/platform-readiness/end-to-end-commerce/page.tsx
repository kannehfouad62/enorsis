import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Route,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { runEndToEndCommerceCertificationAction } from "@/modules/commerce-certification/end-to-end-commerce-certification-actions";
import { getEndToEndCommerceCertificationWorkspace } from "@/modules/commerce-certification/end-to-end-commerce-certification-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function EndToEndCommerceCertificationPage() {
  const data =
    await getEndToEndCommerceCertificationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B13.9 · End-to-End Commerce Certification
          </p>

          <h1 className="mt-3 text-4xl font-black">
            End-to-End Commerce & Transaction Lifecycle
          </h1>

          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Certify the complete buyer–supplier lifecycle before
            manual UAT: tenant governance, supplier onboarding,
            marketplace catalog, purchase request, approval,
            purchase order, supplier acceptance, receipt,
            warehouse, inventory, invoice, three-way match and
            payment.
          </p>
        </div>

        <form
          action={
            runEndToEndCommerceCertificationAction
          }
        >
          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            <RefreshCw className="h-4 w-4" />
            Run commerce certification
          </button>
        </form>
      </div>

      {data.latest ? (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Metric
              label="Status"
              value={data.latest.status}
            />
            <Metric
              label="Score"
              value={pct(
                data.latest.certificationScore,
              )}
            />
            <Metric
              label="Passed"
              value={data.latest.passedChecks}
            />
            <Metric
              label="Warnings"
              value={data.latest.warningChecks}
            />
            <Metric
              label="Failed"
              value={data.latest.failedChecks}
            />
          </section>

          <section className={`${card} mt-8`}>
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-blue-700" />
              <h2 className="text-xl font-black">
                Lifecycle readiness matrix
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {data.checks.map((check) => (
                <article
                  key={check.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {check.status === "PASS" ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                      ) : check.status === "WARN" ? (
                        <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
                      ) : (
                        <XCircle className="mt-0.5 h-5 w-5 text-rose-700" />
                      )}

                      <div>
                        <p className="font-black">
                          {check.checkLabel}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {check.lifecycleStage.replaceAll(
                            "_",
                            " ",
                          )}{" "}
                          · {check.severity}
                        </p>
                        <p className="mt-2 text-sm text-slate-700">
                          {check.message}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                      {check.status}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className={`${card} mt-8`}>
          <p className="text-sm text-slate-600">
            No B13.9 commerce certification has been run yet.
          </p>
        </section>
      )}

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Golden-path lifecycle
          </h2>
        </div>

        <p className="mt-4 text-sm leading-7 text-slate-600">
          Tenant → Supplier → Catalog → Purchase Request → Approval
          → Purchase Order → Supplier Acceptance → Shipment →
          Goods Receipt → Warehouse → Inventory → Invoice →
          Three-Way Match → Payment.
        </p>
      </section>

      <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        B13.9 is non-destructive. It does not create purchase
        requests, purchase orders, shipments, receipts, invoices or
        payments. It certifies the implementation and persistence
        readiness required for the manual UAT.
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <article className={card}>
      <p className="text-xs font-black uppercase text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-black">
        {value}
      </p>
    </article>
  );
}
