import {
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  decideClosedLoopLearningProposalAction,
  generateClosedLoopLearningProposalsAction,
} from "@/modules/closed-loop-procurement/learning-proposal-actions";
import { getClosedLoopLearningProposalWorkspace } from "@/modules/closed-loop-procurement/learning-proposal-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function LearningProposalsPage() {
  const data =
    await getClosedLoopLearningProposalWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            B12.4 · Governed Learning
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Learning Recommendations & Calibration Proposals
          </h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Convert validated accuracy, calibration and
            recommendation-effectiveness evidence into explicit
            human-review proposals. Approved proposals are recorded
            decisions only; they do not automatically change model
            parameters or autonomous policies.
          </p>
        </div>

        <form
          action={
            generateClosedLoopLearningProposalsAction
          }
        >
          <button className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            <RefreshCw className="h-4 w-4" />
            Generate proposals
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Draft proposals"
          value={data.metrics.draft}
        />
        <Metric
          label="High priority"
          value={data.metrics.highPriority}
        />
        <Metric
          label="Approved"
          value={data.metrics.approved}
        />
        <Metric
          label="Rejected"
          value={data.metrics.rejected}
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">
            Governed learning proposals
          </h2>
        </div>

        <div className="mt-5 space-y-4">
          {data.proposals.length === 0 ? (
            <p className="text-sm text-slate-600">
              No learning proposals generated.
            </p>
          ) : (
            data.proposals.map((proposal) => (
              <article
                key={proposal.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-black">
                      {proposal.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {proposal.proposalType.replaceAll(
                        "_",
                        " ",
                      )}{" "}
                      · {proposal.scopeLabel} ·{" "}
                      {proposal.priority} ·{" "}
                      {proposal.status}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                    {proposal.evidenceCount} evidence
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {proposal.rationale}
                </p>

                {proposal.currentValue !== null ||
                proposal.proposedValue !== null ? (
                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    <p>
                      Current:{" "}
                      <strong>
                        {proposal.currentValue ?? "—"}
                      </strong>
                    </p>
                    <p>
                      Proposed:{" "}
                      <strong>
                        {proposal.proposedValue ?? "—"}
                      </strong>
                    </p>
                    <p>
                      Proposal confidence:{" "}
                      <strong>
                        {proposal.confidence?.toFixed(
                          1,
                        ) ?? "—"}
                        %
                      </strong>
                    </p>
                  </div>
                ) : null}

                {proposal.status === "DRAFT" ? (
                  <form
                    action={
                      decideClosedLoopLearningProposalAction
                    }
                    className="mt-5 grid gap-2 md:grid-cols-[1fr_auto_auto]"
                  >
                    <input
                      type="hidden"
                      name="proposalId"
                      value={proposal.id}
                    />
                    <input
                      className={input}
                      name="note"
                      placeholder="Decision rationale"
                    />
                    <button
                      name="decision"
                      value="APPROVE"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve proposal
                    </button>
                    <button
                      name="decision"
                      value="REJECT"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-xs font-black text-white"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </form>
                ) : proposal.decisionNote ? (
                  <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    Decision note:{" "}
                    {proposal.decisionNote}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Approval of a B12.4 proposal records governance intent
          only. It does not update prompts, thresholds, forecasting
          models, recommendation rules or autonomous execution
          policy.
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
      <p className="mt-2 text-2xl font-black">
        {value}
      </p>
    </article>
  );
}
