import {
  finalizeExecutiveBoardPackAction,
  generateExecutiveBoardPackAction,
} from "@/modules/executive-board-reporting/actions";
import { getExecutiveBoardReportingWorkspace } from "@/modules/executive-board-reporting/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ExecutiveBoardReportingPage() {
  const data = await getExecutiveBoardReportingWorkspace();

  const finalized = data.packs.filter(
    (pack) => pack.status === "FINALIZED",
  ).length;
  const generated = data.packs.filter(
    (pack) => pack.status === "GENERATED",
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          Phase B2.8.6.1
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Executive Board Reporting
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Governed board-pack generation from executive KPIs, risks,
          opportunities, AI synthesis and human governance decisions.
        </p>
        </div>
        <a
          href="/app/executive/board-calendar"
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
        >
          Board Calendar
        </a>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Board pack definitions", data.definitions.length],
          ["Generated packs", generated],
          ["Finalized packs", finalized],
          ["Total pack history", data.packs.length],
        ].map(([label, value]) => (
          <article key={String(label)} className={card}>
            <p className="text-xs font-black uppercase text-slate-500">
              {label}
            </p>
            <p className="mt-3 text-4xl font-black">{value}</p>
          </article>
        ))}
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Generate board pack</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.definitions.map((definition) => (
            <article
              key={definition.id}
              className="rounded-2xl bg-slate-50 p-5"
            >
              <p className="text-xs font-black uppercase text-blue-700">
                {definition.packType}
              </p>
              <h3 className="mt-2 font-black">{definition.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {definition.description}
              </p>

              <form
                action={generateExecutiveBoardPackAction}
                className="mt-4 space-y-3"
              >
                <input
                  type="hidden"
                  name="definitionKey"
                  value={definition.definitionKey}
                />
                <select
                  name="periodType"
                  defaultValue={definition.defaultPeriodType}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="ANNUAL">Annual</option>
                  <option value="AD_HOC">Ad hoc</option>
                </select>
                <button className="w-full rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                  Generate pack
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 space-y-5">
        {data.packs.map((pack) => (
          <article key={pack.id} className={card}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">
                  {pack.packType} · {pack.status} · {pack.periodType}
                </p>
                <h2 className="mt-2 text-xl font-black">{pack.title}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {pack.packNumber} · {pack.periodStart.toLocaleDateString()} –{" "}
                  {pack.periodEnd.toLocaleDateString()}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <p>
                  Generated{" "}
                  <span className="font-black">
                    {pack.generatedAt?.toLocaleString() ?? "—"}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Source fingerprint {pack.sourceFingerprint.slice(0, 12)}…
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black uppercase text-slate-500">
                Executive summary
              </p>
              <p className="mt-2 text-sm leading-7">
                {pack.executiveSummary ?? "No executive summary available."}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {(["pdf", "docx", "xlsx", "pptx"] as const).map((format) => (
                <a
                  key={format}
                  href={`/api/executive/board-packs/${pack.id}/export/${format}`}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black"
                >
                  Export {format.toUpperCase()}
                </a>
              ))}

              {pack.status === "GENERATED" ? (
                <form action={finalizeExecutiveBoardPackAction}>
                  <input type="hidden" name="packId" value={pack.id} />
                  <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">
                    Finalize board pack
                  </button>
                </form>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
