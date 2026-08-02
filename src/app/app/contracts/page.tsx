import Link from "next/link";
import {
  createContractAction,
  createContractFromAwardAction,
} from "@/modules/contracts/actions";
import { getContractWorkspace } from "@/modules/contracts/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ContractsPage() {
  const { contracts, suppliers, awardedEvents, tenant } =
    await getContractWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Contract lifecycle
      </p>
      <h1 className="mt-3 text-4xl font-black">Contracts</h1>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Create contract</h2>
        <form
          action={createContractAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <label className="text-sm font-bold">
            Supplier
            <select className={input} name="supplierId" required>
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.tradingName ?? supplier.legalName}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            Title
            <input className={input} name="title" required />
          </label>
          <label className="text-sm font-bold">
            Contract type
            <select className={input} name="type" defaultValue="PURCHASE_AGREEMENT">
              <option value="MASTER_SERVICE_AGREEMENT">Master service agreement</option>
              <option value="PURCHASE_AGREEMENT">Purchase agreement</option>
              <option value="FRAMEWORK_AGREEMENT">Framework agreement</option>
              <option value="STATEMENT_OF_WORK">Statement of work</option>
              <option value="NDA">NDA</option>
              <option value="SOFTWARE_LICENSE">Software license</option>
              <option value="PROFESSIONAL_SERVICES">Professional services</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="text-sm font-bold">
            Currency
            <input
              className={input}
              name="currencyCode"
              defaultValue={tenant.baseCurrencyCode}
              required
            />
          </label>
          <label className="text-sm font-bold">
            Total value
            <input className={input} name="totalValue" type="number" step="0.01" />
          </label>
          <label className="text-sm font-bold">
            Start date
            <input className={input} name="startDate" type="date" />
          </label>
          <label className="text-sm font-bold">
            End date
            <input className={input} name="endDate" type="date" />
          </label>
          <label className="text-sm font-bold">
            Renewal notice days
            <input
              className={input}
              name="renewalNoticeDays"
              type="number"
              defaultValue="90"
            />
          </label>
          <label className="text-sm font-bold">
            Governing law
            <input className={input} name="governingLaw" />
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input name="autoRenew" type="checkbox" />
            Auto renew
          </label>
          <label className="text-sm font-bold md:col-span-2 xl:col-span-4">
            Summary
            <textarea className={`${input} min-h-28`} name="summary" />
          </label>
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Create contract
          </button>
        </form>
      </section>

      {awardedEvents.length ? (
        <section className={`${card} mt-6`}>
          <h2 className="text-xl font-black">Create from sourcing award</h2>
          <div className="mt-4 space-y-3">
            {awardedEvents.map((event) => (
              <form
                key={event.id}
                action={createContractFromAwardAction}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
              >
                <input
                  type="hidden"
                  name="sourcingEventId"
                  value={event.id}
                />
                <div>
                  <p className="font-black">{event.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {event.eventNumber}
                  </p>
                </div>
                <button className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white">
                  Generate contract record
                </button>
              </form>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {contracts.map((contract) => (
          <article key={contract.id} className={card}>
            <p className="text-xs font-black text-blue-700">
              {contract.contractNumber} · {contract.type.replaceAll("_", " ")}
            </p>
            <h2 className="mt-2 text-xl font-black">{contract.title}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {contract.supplier.tradingName ?? contract.supplier.legalName}
            </p>
            <p className="mt-3 text-sm">
              {contract.currencyCode} {contract.totalValue?.toString() ?? "—"} ·{" "}
              {contract.status}
            </p>
            <Link
              href={`/app/contracts/${contract.id}`}
              className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
            >
              Open contract
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
