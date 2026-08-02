import Link from "next/link";
import { submitSourcingResponseAction } from "@/modules/sourcing/actions";
import { getSourcingEvent } from "@/modules/sourcing/queries";

const input = "mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5";

export default async function SourcingEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await getSourcingEvent(id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href="/app/sourcing" className="font-black text-blue-700">← Strategic sourcing</Link>
      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-7">
        <p className="text-xs font-black text-blue-700">{event.eventNumber} · {event.type}</p>
        <h1 className="mt-2 text-3xl font-black">{event.title}</h1>
        <p className="mt-4 text-slate-600">{event.summary}</p>
        <div className="mt-6 rounded-2xl bg-slate-50 p-5 whitespace-pre-wrap">{event.scopeOfWork}</div>

        <div className="mt-6 space-y-4">
          {event.invitations.map((invitation) => {
            const response = event.responses.find((item) => item.supplierId === invitation.supplierId);
            return (
              <article key={invitation.id} className="rounded-2xl border border-slate-200 p-5">
                <h2 className="font-black">{invitation.supplier.tradingName ?? invitation.supplier.legalName}</h2>
                {response ? (
                  <p className="mt-3 font-black">{response.currencyCode} {response.totalBid?.toString()}</p>
                ) : (
                  <form action={submitSourcingResponseAction} className="mt-4 grid gap-4 md:grid-cols-2">
                    <input type="hidden" name="sourcingEventId" value={event.id} />
                    <input type="hidden" name="supplierId" value={invitation.supplierId} />
                    <input className={input} name="currencyCode" defaultValue={event.currencyCode} required />
                    <input className={input} name="totalBid" type="number" step="0.01" placeholder="Total bid" required />
                    <input className={input} name="deliveryDays" type="number" min="0" placeholder="Delivery days" required />
                    <textarea className={`${input} min-h-28 md:col-span-2`} name="technicalResponse" placeholder="Technical response" required />
                    <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white" type="submit">Submit response</button>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
