import {
  Activity,
  AlertTriangle,
  Eye,
  ShieldCheck,
} from "lucide-react";
import {
  initializeMultiEngineAdoptionAction,
  updateMultiEngineAdoptionAction,
} from "@/modules/ai-runtime/multi-engine-adoption-actions";
import { getMultiEngineAdoptionWorkspace } from "@/modules/ai-runtime/multi-engine-adoption-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

function pct(
  numerator: number,
  denominator: number,
) {
  if (denominator === 0) {
    return "0.0%";
  }

  return `${(
    (numerator / denominator) *
    100
  ).toFixed(1)}%`;
}

export default async function MultiEngineAdoptionPage() {
  const data =
    await getMultiEngineAdoptionWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          B13.3 · Multi-Engine Controlled Adoption
        </p>
        <h1 className="mt-3 text-4xl font-black">
          Governed Intelligence Engine Adoption
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Manage runtime-policy adoption independently for
          predictive procurement, predictive inventory and
          predictive capacity. Every engine remains isolated and
          follows OFF → SHADOW → ENFORCED governance.
        </p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="OFF"
          value={data.metrics.off}
        />
        <Metric
          label="SHADOW"
          value={data.metrics.shadow}
        />
        <Metric
          label="ENFORCED"
          value={
            data.metrics.enforced
          }
        />
        <Metric
          label="Decisions"
          value={
            data.metrics.decisions
          }
        />
      </section>

      <section className="mt-8 space-y-5">
        {data.catalog.map(
          (catalogItem) => {
            const adoption =
              data.adoptions.find(
                (item) =>
                  item.decisionPath ===
                  catalogItem.decisionPath,
              );

            if (!adoption) {
              return null;
            }

            return (
              <article
                key={
                  catalogItem.decisionPath
                }
                className={card}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-700" />
                      <h2 className="text-xl font-black">
                        {
                          catalogItem.label
                        }
                      </h2>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {
                        catalogItem.decisionPath
                      }{" "}
                      · default{" "}
                      {
                        adoption.defaultThreshold
                      }
                      %
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                    {adoption.mode}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Cell
                    label="Decisions"
                    value={String(
                      adoption.decisionCount,
                    )}
                  />
                  <Cell
                    label="Shadow differences"
                    value={String(
                      adoption.shadowDifferenceCount,
                    )}
                  />
                  <Cell
                    label="Difference rate"
                    value={pct(
                      adoption.shadowDifferenceCount,
                      adoption.decisionCount,
                    )}
                  />
                </div>

                <form
                  action={
                    updateMultiEngineAdoptionAction
                  }
                  className="mt-5 grid gap-2 md:grid-cols-[220px_1fr_auto]"
                >
                  <input
                    type="hidden"
                    name="decisionPath"
                    value={
                      adoption.decisionPath
                    }
                  />

                  <select
                    className={input}
                    name="mode"
                    defaultValue={
                      adoption.mode
                    }
                  >
                    <option value="OFF">
                      OFF
                    </option>
                    <option value="SHADOW">
                      SHADOW
                    </option>
                    <option value="ENFORCED">
                      ENFORCED
                    </option>
                  </select>

                  <input
                    className={input}
                    name="rationale"
                    placeholder="Governance rationale"
                  />

                  <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">
                    Update mode
                  </button>
                </form>
              </article>
            );
          },
        )}
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Adoption history
          </h2>
        </div>

        <div className="mt-5 space-y-3">
          {data.events.length === 0 ? (
            <form
              action={
                initializeMultiEngineAdoptionAction
              }
            >
              <button className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white">
                Initialize engine adoption
              </button>
            </form>
          ) : (
            data.events.map(
              (event) => (
                <article
                  key={event.id}
                  className="rounded-2xl bg-slate-50 p-4"
                >
                  <p className="font-black">
                    {event.eventType.replaceAll(
                      "_",
                      " ",
                    )}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {event.fromMode ??
                      "—"}{" "}
                    →{" "}
                    {event.toMode ??
                      "—"}{" "}
                    ·{" "}
                    {event.createdAt.toLocaleString()}
                  </p>
                  {event.message ? (
                    <p className="mt-2 text-sm text-slate-700">
                      {
                        event.message
                      }
                    </p>
                  ) : null}
                </article>
              ),
            )
          )}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          OFF and SHADOW preserve each engine&apos;s existing signal
          output. Only ENFORCED may suppress a candidate based on
          the governed confidence threshold. Direct OFF →
          ENFORCED promotion is blocked.
        </p>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          This phase establishes the common multi-engine gateway.
          Predictive inventory and capacity should be connected at
          their exact local signal-persistence points only after
          local source inspection.
        </p>
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

function Cell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-black">
        {value}
      </p>
    </div>
  );
}
