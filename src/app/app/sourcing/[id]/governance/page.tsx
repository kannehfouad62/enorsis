import Link from "next/link";
import {
  assignSourcingEvaluatorAction,
  closeNegotiationRoundAction,
  openNegotiationRoundAction,
  transitionSourcingEventAction,
} from "@/modules/sourcing/lifecycle-actions";
import { getSourcingGovernance } from "@/modules/sourcing/lifecycle-queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";

export default async function SourcingGovernancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { event, members } = await getSourcingGovernance(id);

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
        href={`/app/sourcing/${event.id}`}
        className="font-black text-blue-700"
      >
        ← Sourcing event
      </Link>

      <h1 className="mt-5 text-4xl font-black">
        Sourcing governance board
      </h1>
      <p className="mt-2 text-slate-600">
        {event.eventNumber} · {event.title}
      </p>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Event lifecycle</h2>
        <form
          action={transitionSourcingEventAction}
          className="mt-4 flex flex-wrap gap-3"
        >
          <input type="hidden" name="sourcingEventId" value={event.id} />
          {["PUBLISHED", "OPEN", "EVALUATION", "CLOSED", "CANCELLED"].map(
            (status) => (
              <button
                key={status}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black"
                name="targetStatus"
                value={status}
              >
                Set {status}
              </button>
            ),
          )}
        </form>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-black">Evaluation panel</h2>
          <form
            action={assignSourcingEvaluatorAction}
            className="mt-4 flex gap-3"
          >
            <input type="hidden" name="sourcingEventId" value={event.id} />
            <select className={input} name="evaluatorUserId" required>
              <option value="">Select evaluator</option>
              {members.map((membership) => (
                <option key={membership.id} value={membership.userId}>
                  {membership.user.name ?? membership.user.email}
                </option>
              ))}
            </select>
            <button className="self-end rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">
              Assign
            </button>
          </form>

          <div className="mt-5 space-y-3">
            {event.evaluators.map((evaluator) => {
              const membership = members.find(
                (item) => item.userId === evaluator.userId,
              );
              return (
                <div
                  key={evaluator.id}
                  className="rounded-2xl bg-slate-50 p-4"
                >
                  <p className="font-black">
                    {membership?.user.name ??
                      membership?.user.email ??
                      evaluator.userId}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {evaluator.status}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-black">Negotiation rounds</h2>

          {event.allowMultipleRounds ? (
            <form
              action={openNegotiationRoundAction}
              className="mt-4 grid gap-3"
            >
              <input type="hidden" name="sourcingEventId" value={event.id} />
              <input className={input} name="title" placeholder="Round title" required />
              <textarea
                className={`${input} min-h-24`}
                name="instructions"
                placeholder="Supplier instructions"
              />
              <input
                className={input}
                name="closesAt"
                type="datetime-local"
              />
              <button className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white">
                Open negotiation round
              </button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Multiple rounds are disabled for this event.
            </p>
          )}

          <div className="mt-5 space-y-3">
            {event.rounds.map((round) => (
              <div key={round.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="font-black">
                  Round {round.roundNumber}: {round.title}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {round.status}
                </p>
                {round.status === "OPEN" ? (
                  <form
                    action={closeNegotiationRoundAction}
                    className="mt-3"
                  >
                    <input type="hidden" name="roundId" value={round.id} />
                    <button className="rounded-xl bg-red-700 px-3 py-2 text-xs font-black text-white">
                      Close round
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black">Bid comparison</h2>
          <Link
            href={`/app/sourcing/${event.id}/evaluation`}
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
          >
            Open weighted evaluation
          </Link>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">Supplier</th>
                <th className="p-3">Bid</th>
                <th className="p-3">Delivery</th>
                <th className="p-3">Weighted score</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((item, index) => (
                <tr
                  key={item.response.id}
                  className="border-t border-slate-100"
                >
                  <td className="p-3 font-black">#{index + 1}</td>
                  <td className="p-3 font-semibold">
                    {item.response.supplier.tradingName ??
                      item.response.supplier.legalName}
                  </td>
                  <td className="p-3">
                    {item.response.currencyCode}{" "}
                    {item.response.totalBid?.toString() ?? "—"}
                  </td>
                  <td className="p-3">
                    {item.response.deliveryDays ?? "—"} days
                  </td>
                  <td className="p-3 font-black text-blue-700">
                    {item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
