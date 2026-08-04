import {
  decideWorkflowTaskAction,
  launchWorkflowAction,
} from "@/modules/workflows/actions";
import { getWorkflowInbox } from "@/modules/workflows/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function WorkflowInboxPage() {
  const { tasks, instances } = await getWorkflowInbox();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        My work
      </p>
      <h1 className="mt-3 text-4xl font-black">Workflow Inbox</h1>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Launch workflow</h2>
        <form action={launchWorkflowAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input className={input} name="workflowKey" placeholder="Workflow key" required />
          <input className={input} name="resourceType" placeholder="Resource type" required />
          <input className={input} name="resourceId" placeholder="Resource ID" required />
          <textarea className={`${input} min-h-24 font-mono text-xs xl:col-span-4`} name="context" placeholder='{"amount":25000,"country":"US","riskTier":"HIGH"}' required />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Launch workflow
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Assigned tasks</h2>
        <div className="mt-5 space-y-4">
          {tasks.map((task: (typeof tasks)[number]) => (
            <article key={task.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">
                {task.workflowInstance.workflowDefinition.name} · {task.status}
              </p>
              <h3 className="mt-2 text-lg font-black">{task.workflowStep.name}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {task.workflowInstance.resourceType} · {task.workflowInstance.resourceId}
                {task.dueAt ? ` · Due ${task.dueAt.toLocaleString()}` : ""}
              </p>
              <form action={decideWorkflowTaskAction} className="mt-4 flex flex-wrap gap-3">
                <input type="hidden" name="taskId" value={task.id} />
                <input className="min-w-64 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3" name="comments" placeholder="Decision comments" />
                <button className="rounded-xl bg-emerald-700 px-4 py-3 font-black text-white" name="decision" value="APPROVE">
                  Approve
                </button>
                <button className="rounded-xl bg-amber-600 px-4 py-3 font-black text-white" name="decision" value="RETURN">
                  Return
                </button>
                <button className="rounded-xl bg-red-700 px-4 py-3 font-black text-white" name="decision" value="REJECT">
                  Reject
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section className={`${card} mt-6 overflow-x-auto`}>
        <h2 className="text-xl font-black">Recent workflow instances</h2>
        <table className="mt-5 w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Workflow</th>
              <th className="p-3">Resource</th>
              <th className="p-3">Status</th>
              <th className="p-3">Sequence</th>
              <th className="p-3">Tasks</th>
            </tr>
          </thead>
          <tbody>
            {instances.map((instance: (typeof instances)[number]) => (
              <tr key={instance.id} className="border-t border-slate-100">
                <td className="p-3 font-black">{instance.workflowDefinition.name}</td>
                <td className="p-3">{instance.resourceType} · {instance.resourceId}</td>
                <td className="p-3">{instance.status}</td>
                <td className="p-3">{instance.currentSequence}</td>
                <td className="p-3">{instance.tasks.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
