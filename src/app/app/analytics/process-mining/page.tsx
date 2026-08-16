import Link from "next/link";
import { getProcessMiningWorkspace } from "@/modules/process-mining/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function hours(value: number | null) {
  return value === null ? "—" : `${value}h`;
}

export default async function ProcessMiningPage() {
  const data = await getProcessMiningWorkspace();
  const { summary, processes, variants, bottlenecks } =
    data.mining;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="mt-3 text-4xl font-black">
            Enterprise Process Mining
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Discover actual workflow variants, cycle-time
            bottlenecks, escalation patterns, rework signals and
            conformance deviations from tenant execution history.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/workflows"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
          >
            Workflow Inbox
          </Link>
          <Link
            href="/app/automation/copilot"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Automation Copilot
          </Link>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Read-only analysis · Last evaluated{" "}
        {data.analyzedAt.toLocaleString()} · Up to 1,000 recent
        workflow instances
      </p>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Process instances"
          value={summary.totalInstances}
        />
        <Metric
          label="Average cycle time"
          value={hours(summary.averageCycleHours)}
        />
        <Metric
          label="P90 cycle time"
          value={hours(summary.p90CycleHours)}
        />
        <Metric
          label="Observed variants"
          value={summary.variantCount}
        />
        <Metric
          label="Overdue tasks"
          value={summary.overdueTasks}
        />
        <Metric
          label="Escalated tasks"
          value={summary.escalatedTasks}
        />
        <Metric
          label="Rework signals"
          value={summary.reworkSignals}
        />
        <Metric
          label="Completed instances"
          value={summary.completedInstances}
        />
      </section>

      <section className={`${card} mt-8`}>
        <div>
          <p className="text-xs font-black uppercase text-slate-500">
            Process performance
          </p>
          <h2 className="mt-1 text-2xl font-black">
            Workflow conformance and cycle time
          </h2>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Process</th>
                <th className="px-4 py-3">Instances</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Avg cycle</th>
                <th className="px-4 py-3">P90</th>
                <th className="px-4 py-3">Overdue</th>
                <th className="px-4 py-3">Conformance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processes.map((process) => (
                <tr
                  key={`${process.key}:${process.version}`}
                >
                  <td className="px-4 py-3">
                    <p className="font-black">{process.name}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {process.key} · v{process.version}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {process.instanceCount}
                  </td>
                  <td className="px-4 py-3">
                    {process.completedCount}
                  </td>
                  <td className="px-4 py-3">
                    {hours(process.averageCycleHours)}
                  </td>
                  <td className="px-4 py-3">
                    {hours(process.p90CycleHours)}
                  </td>
                  <td className="px-4 py-3">
                    {process.overdueTasks}
                  </td>
                  <td className="px-4 py-3 font-black">
                    {process.conformancePercent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className={card}>
          <p className="text-xs font-black uppercase text-slate-500">
            Bottleneck discovery
          </p>
          <h2 className="mt-1 text-2xl font-black">
            Slow and exception-prone steps
          </h2>

          <div className="mt-5 space-y-3">
            {bottlenecks.length === 0 ? (
              <p className="text-sm text-slate-500">
                No workflow task history is available yet.
              </p>
            ) : (
              bottlenecks.map((item, index) => (
                <div
                  key={`${item.stepName}:${index}`}
                  className="rounded-2xl bg-slate-50 p-4"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-black">
                        {item.stepName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.stepType} ·{" "}
                        {item.occurrenceCount} occurrences
                      </p>
                    </div>
                    <p className="text-sm font-black">
                      Score {item.bottleneckScore}
                    </p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 md:grid-cols-4">
                    <p>
                      Avg {hours(item.averageDurationHours)}
                    </p>
                    <p>
                      P90 {hours(item.p90DurationHours)}
                    </p>
                    <p>Overdue {item.overdueCount}</p>
                    <p>
                      Escalated {item.escalatedCount}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={card}>
          <p className="text-xs font-black uppercase text-slate-500">
            Variant discovery
          </p>
          <h2 className="mt-1 text-2xl font-black">
            Actual execution paths
          </h2>

          <div className="mt-5 space-y-3">
            {variants.length === 0 ? (
              <p className="text-sm text-slate-500">
                No process variants are available yet.
              </p>
            ) : (
              variants.map((variant, index) => (
                <div
                  key={`${variant.path}:${index}`}
                  className="rounded-2xl bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <p className="text-xs font-black text-blue-700">
                      {variant.count} cases ·{" "}
                      {variant.sharePercent}% share
                    </p>
                    <p className="text-xs text-slate-500">
                      Avg {hours(variant.averageCycleHours)} ·{" "}
                      {variant.completionRate}% completed
                    </p>
                  </div>
                  <p className="mt-3 text-xs leading-6 text-slate-700">
                    {variant.path}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <p className="text-xs font-black uppercase text-blue-700">
          Mining interpretation
        </p>
        <h2 className="mt-1 text-2xl font-black">
          How to use these findings
        </h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
          High-duration or frequently overdue steps are candidates
          for workflow redesign, delegation, SLA changes or safe
          automation. Repeated RETURNED/REJECTED outcomes indicate
          rework. Variants reveal how actual execution differs
          across cases. Use the Automation Copilot to draft changes,
          then validate them in the existing Automation Designer
          before activation.
        </p>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className={card}>
      <p className="text-xs font-black uppercase text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}
