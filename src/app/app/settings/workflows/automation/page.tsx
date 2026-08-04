import Link from "next/link";
import {
  Activity,
  AlarmClock,
  CircleCheck,
  GitBranch,
  Repeat2,
  UserRoundCog,
} from "lucide-react";
import { getWorkflowAutomationDashboard } from "@/modules/workflows/automation-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function WorkflowAutomationDashboardPage() {
  const data = await getWorkflowAutomationDashboard();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Workflow operations
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Automation Control Center
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Monitor active definitions, triggered instances, approval
            delegations and SLA escalations across Enorsis.
          </p>
        </div>
        <Link
          href="/app/settings/workflows"
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
        >
          Open Workflow Designer
        </Link>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
        <Metric
          icon={GitBranch}
          label="Active definitions"
          value={String(data.metrics.activeDefinitions)}
        />
        <Metric
          icon={Activity}
          label="Running"
          value={String(data.metrics.runningInstances)}
        />
        <Metric
          icon={CircleCheck}
          label="Completed"
          value={String(data.metrics.completedInstances)}
        />
        <Metric
          icon={Repeat2}
          label="Rejected"
          value={String(data.metrics.rejectedInstances)}
        />
        <Metric
          icon={UserRoundCog}
          label="Delegations"
          value={String(data.metrics.activeDelegations)}
        />
        <Metric
          icon={AlarmClock}
          label="Pending escalations"
          value={String(data.metrics.pendingEscalations)}
        />
      </div>

      <section className={`${card} mt-6 overflow-x-auto`}>
        <h2 className="text-xl font-black">Automatic trigger registry</h2>
        <table className="mt-5 w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Workflow</th>
              <th className="p-3">Resource</th>
              <th className="p-3">Trigger event</th>
              <th className="p-3">Version</th>
              <th className="p-3">Steps</th>
            </tr>
          </thead>
          <tbody>
            {data.definitions.map((definition) => (
              <tr key={definition.id} className="border-t border-slate-100">
                <td className="p-3">
                  <Link
                    href={`/app/settings/workflows/${definition.id}`}
                    className="font-black text-blue-700"
                  >
                    {definition.name}
                  </Link>
                </td>
                <td className="p-3">{definition.resourceType}</td>
                <td className="p-3">{definition.triggerEvent}</td>
                <td className="p-3">{definition.version}</td>
                <td className="p-3">{definition.steps.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Recent instances</h2>
          <div className="mt-5 space-y-3">
            {data.instances.slice(0, 12).map((instance) => (
              <article
                key={instance.id}
                className="rounded-2xl bg-slate-50 p-4"
              >
                <p className="font-black">
                  {instance.workflowDefinition.name}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {instance.resourceType} · {instance.resourceId}
                </p>
                <p className="mt-2 text-xs font-black text-blue-700">
                  {instance.status} · {instance.tasks.length} tasks
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">SLA escalations</h2>
          <div className="mt-5 space-y-3">
            {data.escalations.slice(0, 12).map((escalation) => (
              <article
                key={escalation.id}
                className="rounded-2xl bg-slate-50 p-4"
              >
                <p className="font-black">
                  {escalation.workflowInstance.workflowDefinition.name}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Scheduled {escalation.scheduledAt.toLocaleString()}
                </p>
                <p className="mt-2 text-sm text-amber-700">
                  {escalation.reason}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <article className={card}>
      <Icon className="h-5 w-5 text-blue-700" />
      <p className="mt-4 text-xs font-bold uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </article>
  );
}
