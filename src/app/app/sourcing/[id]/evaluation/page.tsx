import Link from "next/link";
import {
  decideSourcingAwardAction,
  recommendSourcingAwardAction,
  scoreSourcingResponseAction,
} from "@/modules/sourcing/evaluation-actions";
import { getSourcingEvaluation } from "@/modules/sourcing/evaluation-queries";

export default async function EvaluationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, event } = await getSourcingEvaluation(id);

  const ranked = event.responses
    .map((response) => ({
      response,
      total: response.scores.reduce(
        (sum, score) => sum + Number(score.weightedScore),
        0,
      ),
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link
        className="font-black text-blue-700"
        href={`/app/sourcing/${event.id}`}
      >
        ← Sourcing event
      </Link>
      <h1 className="mt-5 text-4xl font-black">Bid evaluation</h1>
      <p className="mt-2 text-slate-600">
        {event.eventNumber} · {event.title}
      </p>

      <div className="mt-8 space-y-5">
        {event.responses.map((response) => (
          <form
            key={response.id}
            action={scoreSourcingResponseAction}
            className="rounded-3xl border border-slate-200 bg-white p-6"
          >
            <input type="hidden" name="responseId" value={response.id} />
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">
                  {response.supplier.tradingName ??
                    response.supplier.legalName}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {response.currencyCode} {response.totalBid?.toString()} ·{" "}
                  {response.deliveryDays ?? "—"} days
                </p>
              </div>
              <span className="font-black text-blue-700">
                {ranked
                  .find((item) => item.response.id === response.id)
                  ?.total.toFixed(2)}{" "}
                points
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {event.criteria.map((criterion) => {
                const existing = response.scores.find(
                  (score) => score.criterionId === criterion.id,
                );
                return (
                  <div
                    key={criterion.id}
                    className="rounded-2xl bg-slate-50 p-4"
                  >
                    <p className="font-black">
                      {criterion.name} · {criterion.weight}%
                    </p>
                    <input
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                      name={`score_${criterion.id}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      defaultValue={existing?.score.toString() ?? ""}
                      placeholder="Score 0–100"
                      required
                    />
                    <textarea
                      className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                      name={`rationale_${criterion.id}`}
                      defaultValue={existing?.rationale ?? ""}
                      placeholder="Evaluation rationale"
                    />
                  </div>
                );
              })}
            </div>

            <button
              className="mt-5 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
              type="submit"
            >
              Save evaluation
            </button>
          </form>
        ))}
      </div>

      <section className="mt-8 rounded-3xl border border-blue-100 bg-blue-50 p-6">
        <h2 className="text-xl font-black">Award recommendation</h2>
        {event.award ? (
          <>
            <p className="mt-4 leading-7 text-slate-700">
              {event.award.recommendation}
            </p>
            <p className="mt-3 font-black text-blue-700">
              Confidence: {event.award.confidence}% · Status:{" "}
              {event.award.status}
            </p>
          </>
        ) : (
          <form action={recommendSourcingAwardAction} className="mt-4">
            <input
              type="hidden"
              name="sourcingEventId"
              value={event.id}
            />
            <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
              Generate explainable recommendation
            </button>
          </form>
        )}

        {event.award?.status === "RECOMMENDED" &&
        session.user.roles.some((role) =>
          ["PROCUREMENT_EXECUTIVE", "TENANT_ADMIN", "TENANT_OWNER"].includes(
            role,
          ),
        ) ? (
          <form
            action={decideSourcingAwardAction}
            className="mt-5 flex flex-wrap gap-3"
          >
            <input
              type="hidden"
              name="sourcingEventId"
              value={event.id}
            />
            <input
              className="min-w-64 flex-1 rounded-xl border border-blue-200 bg-white px-4 py-3"
              name="comments"
              placeholder="Executive decision comments"
            />
            <button
              className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white"
              name="decision"
              value="APPROVED"
            >
              Approve award
            </button>
            <button
              className="rounded-xl bg-red-700 px-5 py-3 font-black text-white"
              name="decision"
              value="REJECTED"
            >
              Reject recommendation
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
