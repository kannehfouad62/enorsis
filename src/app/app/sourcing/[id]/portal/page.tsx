import {
  answerSourcingQuestionAction,
  createSupplierPortalAccessAction,
  openSealedBidsAction,
} from "@/modules/sourcing/portal-actions";
import { getSourcingPortalGovernance } from "@/modules/sourcing/portal-queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";

export default async function SourcingPortalGovernancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { event, members } = await getSourcingPortalGovernance(id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Supplier collaboration
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Portal and sealed bids
      </h1>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Supplier access</h2>
        <div className="mt-5 space-y-4">
          {event.invitations.map((invitation) => (
            <article
              key={invitation.id}
              className="rounded-2xl bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-black">
                    {invitation.supplier.tradingName ??
                      invitation.supplier.legalName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {invitation.status}
                  </p>
                </div>
                <form action={createSupplierPortalAccessAction}>
                  <input
                    type="hidden"
                    name="invitationId"
                    value={invitation.id}
                  />
                  <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">
                    Generate portal token
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-black">Supplier questions</h2>
        <div className="mt-5 space-y-4">
          {event.questions.map((question) => (
            <form
              key={question.id}
              action={answerSourcingQuestionAction}
              className="rounded-2xl bg-slate-50 p-4"
            >
              <input type="hidden" name="questionId" value={question.id} />
              <p className="font-black">
                {question.supplier.tradingName ??
                  question.supplier.legalName}
              </p>
              <p className="mt-2 text-sm">{question.question}</p>
              <textarea
                className={`${input} min-h-20`}
                name="answer"
                defaultValue={question.answer ?? ""}
                placeholder="Procurement response"
              />
              <button className="mt-3 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white">
                Publish answer
              </button>
            </form>
          ))}
        </div>
      </section>

      {event.sealedResponses ? (
        <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-xl font-black text-amber-950">
            Controlled sealed-bid opening
          </h2>

          {event.sealedBidOpening?.status === "OPENED" ? (
            <p className="mt-3 text-sm text-amber-800">
              Opened with {event.sealedBidOpening.responseCount} submitted
              responses.
            </p>
          ) : (
            <form action={openSealedBidsAction} className="mt-5 grid gap-4">
              <input type="hidden" name="sourcingEventId" value={event.id} />
              <label className="text-sm font-bold">
                Witnesses
                <select className={input} name="witnessUserIds" multiple>
                  {members.map((membership) => (
                    <option
                      key={membership.id}
                      value={membership.userId}
                    >
                      {membership.user.name ?? membership.user.email}
                    </option>
                  ))}
                </select>
              </label>
              <textarea
                className={`${input} min-h-24`}
                name="openingNotes"
                placeholder="Opening notes"
              />
              <button className="rounded-xl bg-amber-700 px-5 py-3 text-sm font-black text-white">
                Open sealed bids
              </button>
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
}
