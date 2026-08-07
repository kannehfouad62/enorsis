import Link from "next/link";
import type { EnterpriseKpiCard } from "@/core/enterprise-analytics/kpi-engine";

function valueLabel(card: EnterpriseKpiCard) {
  if (card.currentValue === null) return "Not calculated";

  if (card.metricType === "CURRENCY") {
    return `${card.currencyCode ?? "USD"} ${card.currentValue.toLocaleString()}`;
  }

  if (card.metricType === "PERCENTAGE") {
    return `${card.currentValue.toFixed(2)}%`;
  }

  return `${card.currentValue.toLocaleString()}${card.unit ? ` ${card.unit}` : ""}`;
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function ExecutiveKpiGrid({
  cards,
}: {
  cards: EnterpriseKpiCard[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const content = (
          <article className="h-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  {card.domain}
                </p>
                <h3 className="mt-2 text-sm font-black">{card.name}</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black">
                {statusLabel(card.healthStatus)}
              </span>
            </div>

            <p className="mt-5 text-3xl font-black">{valueLabel(card)}</p>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-slate-500">Trend</p>
                <p className="mt-1 font-black">{statusLabel(card.trendDirection)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-slate-500">Target</p>
                <p className="mt-1 font-black">
                  {card.targetValue?.toLocaleString() ?? "—"}
                </p>
              </div>
            </div>
          </article>
        );

        return card.drilldownPath ? (
          <Link key={card.id} href={card.drilldownPath}>
            {content}
          </Link>
        ) : (
          <div key={card.id}>{content}</div>
        );
      })}
    </div>
  );
}
