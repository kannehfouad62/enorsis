import Link from "next/link";

import {
  getRtoExecutiveAssuranceAnalytics,
} from "@/modules/requisition-to-order/rto-executive-assurance-analytics";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

const pct = (value: number) => `${value.toFixed(1)}%`;

function healthClass(health: string) {
  if (health === "CRITICAL") return "bg-rose-100 text-rose-700";
  if (health === "AT_RISK") return "bg-orange-100 text-orange-700";
  if (health === "ATTENTION") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

export default async function RtoExecutiveAssuranceAnalyticsPage() {
  const data = await getRtoExecutiveAssuranceAnalytics();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">
            Requisition-to-order governance
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">
            Executive Assurance & Control Analytics
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Executive control health across lifecycle assurance,
            SLA performance, escalations, exception exposure,
            acknowledgment, and high-risk procurement journeys.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm font-black text-slate-600">
              Overall control health
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${healthClass(data.controlHealth)}`}>
              {data.controlHealth.replaceAll("_", " ")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/requisition-to-order/assurance/audit-evidence"
            className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white"
          >
            Audit evidence
          </Link>
          <Link
            href="/app/requisition-to-order/analytics"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800"
          >
            Procurement analytics
          </Link>
          <Link
            href="/app/requisition-to-order/assurance/escalations"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800"
          >
            Escalation assurance
          </Link>
          <Link
            href="/app/requisition-to-order/assurance"
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
          >
            Lifecycle assurance
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Lifecycle assurance rate" value={pct(data.metrics.lifecycleAssuranceRate)} />
        <Metric label="SLA compliance rate" value={pct(data.metrics.slaComplianceRate)} />
        <Metric label="Escalation acknowledgment" value={pct(data.metrics.acknowledgmentRate)} />
        <Metric label="Escalation delivery success" value={pct(data.metrics.deliverySuccessRate)} />
        <Metric label="Critical SLA breaches" value={String(data.metrics.criticalSlaBreaches)} />
        <Metric label="Open exceptions" value={String(data.metrics.openExceptions)} />
        <Metric label="Unowned controls" value={String(data.metrics.unownedControls)} />
        <Metric label="Overdue journeys" value={String(data.metrics.overdueJourneys)} />
        <Metric label="Critical journeys" value={String(data.metrics.criticalJourneys)} />
        <Metric label="High-risk journeys" value={String(data.metrics.highRiskJourneys)} />
        <Metric label="Unacknowledged escalations" value={String(data.metrics.unacknowledgedEscalations)} />
        <Metric
          label="Avg. escalation age"
          value={`${data.metrics.averageEscalationAgeHours.toFixed(1)}h`}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className={card}>
          <h2 className="text-xl font-black text-slate-950">
            Control-health breakdown
          </h2>
          <div className="mt-5 space-y-3">
            {[
              ["Lifecycle assured", data.lifecycleSummary.assured],
              ["Lifecycle attention", data.lifecycleSummary.attention],
              ["Lifecycle at risk", data.lifecycleSummary.atRisk],
              ["Lifecycle critical", data.lifecycleSummary.critical],
              ["SLA breached", data.slaSummary.breached],
              ["SLA critical breach", data.slaSummary.criticalBreaches],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
              >
                <span className="text-sm font-bold text-slate-700">{label}</span>
                <span className="text-xl font-black text-slate-950">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={card}>
          <h2 className="text-xl font-black text-slate-950">
            Escalation assurance
          </h2>
          <div className="mt-5 space-y-3">
            {[
              ["Escalations", data.escalationSummary.total],
              ["Critical escalations", data.escalationSummary.critical],
              ["Acknowledged", data.escalationSummary.acknowledged],
              ["Unacknowledged", data.escalationSummary.unacknowledged],
              ["Delivery failures", data.escalationSummary.deliveryFailures],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
              >
                <span className="text-sm font-bold text-slate-700">{label}</span>
                <span className="text-xl font-black text-slate-950">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Highest-risk procurement journeys
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Critical and high-priority journeys ranked by the existing assurance risk score.
            </p>
          </div>
          <Link
            href="/app/requisition-to-order/assurance/priority"
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
          >
            Open priority queue
          </Link>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Journey</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Risk score</th>
                <th className="px-4 py-3">Exceptions</th>
                <th className="px-4 py-3">Pending approvals</th>
                <th className="px-4 py-3">Payment gaps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.highRiskJourneys.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-black">{item.priority}</td>
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-950">{item.journeyNumber}</p>
                    <p className="mt-1 text-slate-500">{item.title}</p>
                  </td>
                  <td className="px-4 py-3">
                    {item.status}
                    {item.overdue ? " · OVERDUE" : ""}
                  </td>
                  <td className="px-4 py-3 font-black">{item.score}</td>
                  <td className="px-4 py-3">{item.activeExceptions}</td>
                  <td className="px-4 py-3">{item.pendingApprovals}</td>
                  <td className="px-4 py-3">{item.missingPaymentReadiness}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!data.highRiskJourneys.length ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No critical or high-risk procurement journeys are currently present.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={card}>
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}
