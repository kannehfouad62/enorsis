import Link from "next/link";

import {
  certifyTreasuryCloseAction,
} from "@/modules/treasury-executive-reporting/actions";
import {
  getTreasuryExecutiveReport,
} from "@/modules/treasury-executive-reporting/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function TreasuryExecutivePage({
  searchParams,
}: {
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
}) {
  const data = await getTreasuryExecutiveReport();
  const params = await searchParams;

  return (
    <main className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
            Executive finance
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Treasury Executive Report
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Consolidated treasury liquidity, FX, connectivity, and
            reconciliation readiness with governed close certification.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/requisition-to-order/treasury/connectivity"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700"
          >
            Connectivity
          </Link>
          <Link
            href="/app/requisition-to-order/treasury"
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
          >
            Treasury operations
          </Link>
        </div>
      </header>

      {params.message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-900">
          {params.message}
        </div>
      ) : null}

      {params.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-900">
          {params.error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          [
            "Available cash",
            money(
              data.summary.availableCash,
              data.baseCurrencyCode,
            ),
          ],
          [
            "Projected 30-day cash",
            money(
              data.summary.projected30DayCash,
              data.baseCurrencyCode,
            ),
          ],
          [
            "Treasury accounts",
            String(data.summary.accountCount),
          ],
          [
            "Open blockers",
            String(
              data.riskItems.reduce(
                (sum, item) =>
                  sum + (item.blocking ? item.count : 0),
                0,
              ),
            ),
          ],
          [
            "Close readiness",
            data.summary.readiness
              ? "READY"
              : "BLOCKED",
          ],
        ].map(([label, value]) => (
          <div key={label} className={card}>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Executive control assessment
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Every control below must be clear before treasury close can
              be certified.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-black ${
              data.summary.readiness
                ? "bg-emerald-100 text-emerald-700"
                : "bg-rose-100 text-rose-700"
            }`}
          >
            {data.summary.readiness ? "READY" : "BLOCKED"}
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {data.riskItems.map((item) => (
            <div
              key={item.name}
              className="rounded-2xl bg-slate-50 p-4"
            >
              <p className="text-sm font-black text-slate-950">
                {item.name}
              </p>
              <p
                className={`mt-2 text-2xl font-black ${
                  item.blocking
                    ? "text-rose-700"
                    : "text-emerald-700"
                }`}
              >
                {item.count}
              </p>
            </div>
          ))}
        </div>

        {data.missingFxCurrencies.length ? (
          <p className="mt-4 text-sm font-bold text-amber-700">
            Missing FX rates:{" "}
            {data.missingFxCurrencies.join(", ")}
          </p>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className={card}>
          <h2 className="text-xl font-black text-slate-950">
            Cash outlook
          </h2>

          <div className="mt-5 space-y-4">
            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600">
                Expected 30-day inflows
              </span>
              <strong>
                {money(
                  data.summary.expectedInflows,
                  data.baseCurrencyCode,
                )}
              </strong>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600">
                Expected 30-day outflows
              </span>
              <strong>
                {money(
                  data.summary.expectedOutflows,
                  data.baseCurrencyCode,
                )}
              </strong>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-100 pt-4">
              <span className="text-sm font-black text-slate-950">
                Projected liquidity
              </span>
              <strong className="text-blue-700">
                {money(
                  data.summary.projected30DayCash,
                  data.baseCurrencyCode,
                )}
              </strong>
            </div>
          </div>
        </div>

        <div className={card}>
          <h2 className="text-xl font-black text-slate-950">
            Reconciliation close linkage
          </h2>

          {data.latestReconciliationClose ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="font-black text-slate-950">
                Latest reconciliation close
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {data.latestReconciliationClose.periodStart.toLocaleDateString()}
                {" – "}
                {data.latestReconciliationClose.periodEnd.toLocaleDateString()}
              </p>
              <p className="mt-2 text-sm font-black text-emerald-700">
                {data.latestReconciliationClose.status}
              </p>
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500">
              No reconciliation close period has been recorded yet.
            </p>
          )}

          <Link
            href="/app/requisition-to-order/reconciliation"
            className="mt-4 inline-block text-sm font-black text-blue-700"
          >
            Review reconciliation controls →
          </Link>
        </div>
      </section>

      <section className={card}>
        <h2 className="text-xl font-black text-slate-950">
          Treasury close certification
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Certification is blocked automatically while any executive
          control assessment is unresolved.
        </p>

        <form
          action={certifyTreasuryCloseAction}
          className="mt-5 grid gap-3 md:grid-cols-[180px_180px_1fr_auto]"
        >
          <input
            type="date"
            name="periodStart"
            required
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            name="periodEnd"
            required
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            name="attestationNote"
            required
            minLength={20}
            placeholder="Finance leadership close attestation"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!data.summary.readiness}
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Certify close
          </button>
        </form>
      </section>

      <section className={card}>
        <h2 className="text-xl font-black text-slate-950">
          Certification history
        </h2>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="pb-3">Period</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Certified</th>
                <th className="pb-3">Base currency</th>
                <th className="pb-3 text-right">Available cash</th>
                <th className="pb-3 text-right">30-day projected</th>
              </tr>
            </thead>
            <tbody>
              {data.certifications.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-slate-100"
                >
                  <td className="py-4 font-black">
                    {item.periodStart.toLocaleDateString()}
                    {" – "}
                    {item.periodEnd.toLocaleDateString()}
                  </td>
                  <td className="py-4">{item.status}</td>
                  <td className="py-4">
                    {item.certifiedAt.toLocaleString()}
                  </td>
                  <td className="py-4">
                    {item.baseCurrencyCode}
                  </td>
                  <td className="py-4 text-right font-black">
                    {money(
                      Number(item.availableCash),
                      item.baseCurrencyCode,
                    )}
                  </td>
                  <td className="py-4 text-right font-black">
                    {money(
                      Number(item.projected30DayCash),
                      item.baseCurrencyCode,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.certifications.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No treasury close certifications have been recorded.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
