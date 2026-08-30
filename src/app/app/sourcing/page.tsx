import Link from "next/link";
import { createSourcingEventAction } from "@/modules/sourcing/actions";
import { getSourcingWorkspace } from "@/modules/sourcing/queries";
import { LocalizedText } from "@/components/LocalizedText";

const input = "mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5";

export default async function SourcingPage() {
  const { events, suppliers, tenant } = await getSourcingWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700"><LocalizedText namespace="sourcingPage" messageKey="strategicSourcing" /></p>
      <h1 className="mt-3 text-4xl font-black"><LocalizedText namespace="sourcingPage" messageKey="rfxWorkspace" /></h1>

      <form action={createSourcingEventAction} className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-bold"><LocalizedText namespace="sourcingPage" messageKey="type" /><select className={input} name="type"><option>RFI</option><option>RFQ</option><option>RFP</option></select></label>
        <label className="text-sm font-bold"><LocalizedText namespace="sourcingPage" messageKey="title" /><input className={input} name="title" required /></label>
        <label className="text-sm font-bold"><LocalizedText namespace="sourcingPage" messageKey="currency" /><input className={input} name="currencyCode" defaultValue={tenant.baseCurrencyCode} required /></label>
        <label className="text-sm font-bold"><LocalizedText namespace="sourcingPage" messageKey="estimatedValue" /><input className={input} name="estimatedValue" type="number" step="0.01" /></label>
        <label className="text-sm font-bold"><LocalizedText namespace="sourcingPage" messageKey="deadline" /><input className={input} name="responseDeadline" type="datetime-local" /></label>
        <label className="text-sm font-bold"><LocalizedText namespace="sourcingPage" messageKey="suppliers" /><select className={input} name="supplierIds" multiple required>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.tradingName ?? supplier.legalName}</option>)}</select></label>
        <label className="text-sm font-bold md:col-span-2"><LocalizedText namespace="sourcingPage" messageKey="summary" /><textarea className={`${input} min-h-24`} name="summary" required /></label>
        <label className="text-sm font-bold md:col-span-2 xl:col-span-4"><LocalizedText namespace="sourcingPage" messageKey="scopeOfWork" /><textarea className={`${input} min-h-40`} name="scopeOfWork" required /></label>
        <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white" type="submit"><LocalizedText namespace="sourcingPage" messageKey="publishEvent" /></button>
      </form>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {events.map((event) => (
          <article key={event.id} className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-black text-blue-700">{event.eventNumber} · {event.type}</p>
            <h2 className="mt-2 text-xl font-black">{event.title}</h2>
            <p className="mt-2 text-sm text-slate-500">{event.invitations.length} invited · {event.responses.length} responses</p>
            <Link href={`/app/sourcing/${event.id}`} className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"><LocalizedText namespace="sourcingPage" messageKey="openEvent" /></Link>
          </article>
        ))}
      </div>
    </div>
  );
}
