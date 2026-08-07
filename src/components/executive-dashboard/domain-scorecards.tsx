import type { EnterpriseKpiDomainSummary } from "@/core/enterprise-analytics/kpi-engine";

export function ExecutiveDomainScorecards({
  domains,
}: {
  domains: EnterpriseKpiDomainSummary[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {domains.map((domain) => (
        <article
          key={domain.domain}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            {domain.domain}
          </p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-black">{domain.healthScore}</p>
              <p className="mt-1 text-xs text-slate-500">Health score / 100</p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>{domain.metricCount} KPIs</p>
              <p>{domain.criticalCount} critical</p>
              <p>{domain.warningCount} warning</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
