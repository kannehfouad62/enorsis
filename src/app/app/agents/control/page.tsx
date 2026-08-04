import Link from "next/link";
import { createAgentTaskAction } from "@/modules/agents/actions";
import { getAgentControlWorkspace } from "@/modules/agents/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function AgentControlPage() {
  const { agents, tasks } = await getAgentControlWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Governed autonomy
      </p>
      <h1 className="mt-3 text-4xl font-black">AI Agent Control Plane</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Queue analytical and drafting work for policy-bound agents. Human users
        retain authority for supplier approval, sourcing awards, contracts,
        purchase orders, invoices and payments.
      </p>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Create agent task</h2>
        <form
          action={createAgentTaskAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <label className="text-sm font-bold">
            Agent
            <select className={input} name="agentId" required>
              <option value="">Select agent</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} · {agent.autonomyLevel}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            Task type
            <select className={input} name="type" defaultValue="EXECUTIVE_BRIEF">
              <option value="SUPPLIER_DUE_DILIGENCE">Supplier due diligence</option>
              <option value="RFX_DRAFT">RFx draft</option>
              <option value="NEGOTIATION_PLAN">Negotiation plan</option>
              <option value="CONTRACT_REVIEW">Contract review</option>
              <option value="SPEND_OPPORTUNITY">Spend opportunity</option>
              <option value="RISK_MONITORING">Risk monitoring</option>
              <option value="EXECUTIVE_BRIEF">Executive brief</option>
              <option value="INVOICE_EXCEPTION_ANALYSIS">Invoice exception analysis</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            Priority
            <input className={input} name="priority" type="number" min="1" max="100" defaultValue="50" />
          </label>
          <label className="text-sm font-bold">
            Title
            <input className={input} name="title" required />
          </label>
          <label className="text-sm font-bold">
            Resource type
            <input className={input} name="resourceType" placeholder="Supplier, Contract, SourcingEvent..." />
          </label>
          <label className="text-sm font-bold">
            Resource ID
            <input className={input} name="resourceId" />
          </label>
          <label className="text-sm font-bold md:col-span-2 xl:col-span-4">
            Instructions
            <textarea
              className={`${input} min-h-40`}
              name="instruction"
              placeholder="Describe the analysis or draft required, including facts, constraints and desired output."
              required
            />
          </label>
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Create governed task
          </button>
        </form>
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {tasks.map((task) => (
          <article key={task.id} className={card}>
            <p className="text-xs font-black text-blue-700">
              {task.type.replaceAll("_", " ")} · {task.status}
            </p>
            <h2 className="mt-2 text-xl font-black">{task.title}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {task.agent.name} · Priority {task.priority}
            </p>
            <p className="mt-3 text-sm">
              {task.approvals.length} approval steps · {task.attempts.length} attempts
            </p>
            <Link
              href={`/app/agents/control/${task.id}`}
              className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
            >
              Open task
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
