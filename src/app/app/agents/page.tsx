import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  reviewAiExecutionAction,
  runProcurementCopilotAction,
} from "@/modules/ai/actions";
import { getAiWorkspace } from "@/modules/ai/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default async function AiAgentWorkspacePage() {
  const { session, executions } = await getAiWorkspace();
  const canReview = session.user.roles.some((role) =>
    [
      "PROCUREMENT_MANAGER",
      "PROCUREMENT_EXECUTIVE",
      "RISK_COMPLIANCE",
      "LEGAL",
      "TENANT_ADMIN",
      "TENANT_OWNER",
    ].includes(role),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Governed AI
      </p>
      <h1 className="mt-3 text-4xl font-black">Procurement Copilot</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Generate explainable procurement guidance while preserving tenant
        isolation, human approval and an auditable execution history.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-4">
        <Metric icon={Bot} label="Executions" value={String(executions.length)} />
        <Metric
          icon={BrainCircuit}
          label="Completed"
          value={String(executions.filter((item) => item.status === "COMPLETED").length)}
        />
        <Metric
          icon={ShieldCheck}
          label="Awaiting review"
          value={String(executions.filter((item) => item.reviewStatus === "PENDING").length)}
        />
        <Metric
          icon={CheckCircle2}
          label="Accepted"
          value={String(executions.filter((item) => item.reviewStatus === "ACCEPTED").length)}
        />
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">Create governed analysis</h2>
        </div>

        <form action={runProcurementCopilotAction} className="mt-5">
          <label className="text-sm font-bold">
            Capability
            <select
              className={input}
              name="capability"
              defaultValue="PROCUREMENT_COPILOT"
            >
              <option value="PROCUREMENT_COPILOT">Procurement Copilot</option>
              <option value="RFX_DRAFT">RFx drafting</option>
              <option value="SUPPLIER_ANALYSIS">Supplier analysis</option>
              <option value="CONTRACT_REVIEW">Contract review</option>
              <option value="NEGOTIATION_ADVISOR">Negotiation advisor</option>
              <option value="SPEND_ANALYSIS">Spend analysis</option>
              <option value="RISK_BRIEF">Risk brief</option>
              <option value="EXECUTIVE_BRIEF">Executive brief</option>
            </select>
          </label>
          <label className="mt-4 block text-sm font-bold">
            Request and supporting context
            <textarea
              className={`${input} min-h-56`}
              name="input"
              placeholder="Describe the procurement decision, facts, constraints, values, suppliers, risks and desired outcome."
              required
            />
          </label>
          <button className="mt-4 rounded-xl bg-slate-950 px-5 py-3 font-black text-white hover:bg-blue-700">
            Run governed AI analysis
          </button>
        </form>
      </section>

      <div className="mt-6 space-y-5">
        {executions.map((execution) => (
          <article
            key={execution.id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">
                  {execution.capability.replaceAll("_", " ")} · {execution.model}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Prompt version {execution.promptVersion ?? 1} ·{" "}
                  {execution.totalTokens ?? 0} tokens ·{" "}
                  {execution.latencyMs ?? 0} ms
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                {execution.reviewStatus.replaceAll("_", " ")}
              </span>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-5">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {execution.outputText ?? execution.errorMessage ?? "Processing"}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span className="font-black">
                Confidence: {execution.confidence ?? 0}%
              </span>
              <span>Status: {execution.status}</span>
            </div>

            {canReview &&
            execution.status === "COMPLETED" &&
            execution.reviewStatus === "PENDING" ? (
              <form action={reviewAiExecutionAction} className="mt-5 flex gap-3">
                <input type="hidden" name="executionId" value={execution.id} />
                <button
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white"
                  name="decision"
                  value="ACCEPTED"
                >
                  Accept recommendation
                </button>
                <button
                  className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white"
                  name="decision"
                  value="REJECTED"
                >
                  Reject recommendation
                </button>
              </form>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <Icon className="h-5 w-5 text-blue-700" />
      <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </article>
  );
}
