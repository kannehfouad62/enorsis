import {
  assignGovernedExecutiveInsightReviewerAction,
  decideGovernedExecutiveInsightApprovalAction,
  escalateOverdueGovernedExecutiveApprovalsAction,
} from "@/modules/governed-executive-ai/governance-actions";
import { getGovernedExecutiveAiGovernanceWorkspace } from "@/modules/governed-executive-ai/governance-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function GovernedExecutiveAiGovernancePage() {
  const data = await getGovernedExecutiveAiGovernanceWorkspace();

  const pending = data.approvals.filter((item) =>
    ["PENDING_REVIEW", "IN_REVIEW", "CHANGES_REQUESTED"].includes(item.status),
  ).length;
  const escalated = data.approvals.filter(
    (item) => item.status === "ESCALATED",
  ).length;
  const approved = data.approvals.filter(
    (item) => item.status === "APPROVED",
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Phase B2.8.5.4
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Executive AI Governance & Human Approval
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Reviewer assignments, formal approval decisions, escalation
            controls and complete audit history for governed executive AI
            recommendations.
          </p>
        </div>

        <form action={escalateOverdueGovernedExecutiveApprovalsAction}>
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Escalate overdue reviews
          </button>
        </form>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Pending / in review", pending],
          ["Escalated", escalated],
          ["Approved", approved],
          ["Awaiting governance record", data.reviewableInsights.length],
        ].map(([label, value]) => (
          <article key={String(label)} className={card}>
            <p className="text-xs font-black uppercase text-slate-500">
              {label}
            </p>
            <p className="mt-3 text-4xl font-black">{value}</p>
          </article>
        ))}
      </section>

      {data.reviewableInsights.length > 0 ? (
        <section className={`${card} mt-8`}>
          <h2 className="text-xl font-black">Insights awaiting reviewer assignment</h2>
          <div className="mt-5 space-y-4">
            {data.reviewableInsights.map((insight) => (
              <article key={insight.id} className="rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-black uppercase text-blue-700">
                  {insight.severity} · {insight.domain}
                </p>
                <h3 className="mt-1 font-black">{insight.title}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {insight.executiveSummary}
                </p>

                <form
                  action={assignGovernedExecutiveInsightReviewerAction}
                  className="mt-4 grid gap-3 md:grid-cols-3"
                >
                  <input type="hidden" name="insightId" value={insight.id} />
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    name="reviewerUserId"
                    placeholder="Reviewer user ID"
                    required
                  />
                  <input
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    name="dueAt"
                    type="datetime-local"
                  />
                  <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
                    Assign reviewer
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8 space-y-5">
        {data.approvals.map((approval) => (
          <article key={approval.id} className={card}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">
                  {approval.status} · {approval.insight.severity} ·{" "}
                  {approval.insight.domain}
                </p>
                <h2 className="mt-2 text-xl font-black">
                  {approval.insight.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {approval.insight.executiveSummary}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <p>
                  Reviewer:{" "}
                  <span className="font-black">
                    {approval.assignedReviewerUserId ?? "Unassigned"}
                  </span>
                </p>
                <p className="mt-1">
                  Due:{" "}
                  <span className="font-black">
                    {approval.dueAt?.toLocaleString() ?? "Not set"}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase text-slate-500">
                Recommendation under review
              </p>
              <p className="mt-2 text-sm leading-6">
                {approval.insight.recommendation ??
                  "No recommendation generated."}
              </p>
            </div>

            {!["APPROVED", "REJECTED", "CANCELLED"].includes(
              approval.status,
            ) ? (
              <form
                action={decideGovernedExecutiveInsightApprovalAction}
                className="mt-5 grid gap-3 md:grid-cols-3"
              >
                <input
                  type="hidden"
                  name="insightId"
                  value={approval.insightId}
                />
                <select
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  name="decision"
                >
                  <option value="APPROVE">Approve</option>
                  <option value="REJECT">Reject</option>
                  <option value="REQUEST_CHANGES">Request changes</option>
                  <option value="ESCALATE">Escalate</option>
                </select>
                <input
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  name="comment"
                  placeholder="Decision comment"
                />
                <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">
                  Record decision
                </button>
              </form>
            ) : null}

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div>
                <p className="text-xs font-black uppercase text-slate-500">
                  Decision history
                </p>
                <div className="mt-3 space-y-2">
                  {approval.decisions.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No human decision recorded yet.
                    </p>
                  ) : (
                    approval.decisions.map((decision) => (
                      <div
                        key={decision.id}
                        className="rounded-xl border border-slate-200 p-3 text-sm"
                      >
                        <p className="font-black">{decision.decision}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {decision.decidedByUserId} ·{" "}
                          {decision.decidedAt.toLocaleString()}
                        </p>
                        {decision.comment ? (
                          <p className="mt-2 text-xs">{decision.comment}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase text-slate-500">
                  Audit trail
                </p>
                <div className="mt-3 space-y-2">
                  {approval.auditEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-xl border border-slate-200 p-3 text-sm"
                    >
                      <p className="font-black">{event.eventType}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {event.createdAt.toLocaleString()}
                      </p>
                      <p className="mt-2 text-xs">{event.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
