type RiskItem = {
  id: string;
  numericValue: { toString(): string };
  healthStatus: string;
  calculatedAt: Date;
  metricDefinition: {
    name: string;
    domain: string;
    drilldownPath: string | null;
  };
};

export function ExecutiveRiskWatchlist({
  items,
}: {
  items: RiskItem[];
}) {
  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
          No current critical or warning KPI snapshots.
        </div>
      ) : (
        items.map((item) => (
          <article key={item.id} className="rounded-2xl bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-red-700">
                  {item.healthStatus}
                </p>
                <h3 className="mt-1 font-black">
                  {item.metricDefinition.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {item.metricDefinition.domain}
                </p>
              </div>
              <div className="text-right">
                <p className="font-black">{item.numericValue.toString()}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.calculatedAt.toLocaleString()}
                </p>
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
