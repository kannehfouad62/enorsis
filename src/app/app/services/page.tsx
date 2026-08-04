import {
  addServiceMilestoneAction,
  addServiceWorkerAction,
  approveServiceTimeAction,
  createStatementOfWorkAction,
  submitServiceTimeAction,
} from "@/modules/services-procurement/actions";
import { getServicesWorkspace } from "@/modules/services-procurement/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ServicesPage() {
  const data = await getServicesWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Services procurement
      </p>
      <h1 className="mt-3 text-4xl font-black">Services & Workforce</h1>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Active SOWs" value={data.metrics.activeSows} />
        <Metric label="Active workers" value={data.metrics.activeWorkers} />
        <Metric label="Committed value" value={data.metrics.committedValue} money />
        <Metric label="Pending time" value={data.metrics.pendingTime} />
        <Metric label="Approved time" value={data.metrics.approvedTimeValue} money />
      </div>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Create statement of work</h2>
        <form action={createStatementOfWorkAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <select className={input} name="supplierId" required>
            <option value="">Select supplier</option>
            {data.suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.tradingName ?? supplier.legalName}
              </option>
            ))}
          </select>
          <input className={input} name="title" placeholder="SOW title" required />
          <select className={input} name="engagementType">
            <option>FIXED_FEE</option>
            <option>TIME_AND_MATERIALS</option>
            <option>RETAINER</option>
            <option>MILESTONE_BASED</option>
            <option>CONTINGENT_LABOR</option>
          </select>
          <input className={input} name="currencyCode" defaultValue="USD" />
          <input className={input} name="notToExceedAmount" type="number" step="0.01" placeholder="Not-to-exceed amount" required />
          <input className={input} name="startsAt" type="date" required />
          <input className={input} name="endsAt" type="date" required />
          <select className={input} name="businessOwnerUserId">
            <option value="">Assign creator</option>
            {data.members.map((membership) => (
              <option key={membership.id} value={membership.userId}>
                {membership.user.name ?? membership.user.email}
              </option>
            ))}
          </select>
          <textarea className={`${input} min-h-20 md:col-span-2`} name="description" placeholder="Description" required />
          <textarea className={`${input} min-h-24 md:col-span-2`} name="scopeOfWork" placeholder="Scope of work" required />
          <textarea className={`${input} min-h-24 md:col-span-2`} name="deliverables" placeholder="Deliverables" required />
          <textarea className={`${input} min-h-24 md:col-span-2`} name="acceptanceCriteria" placeholder="Acceptance criteria" required />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Create SOW
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">SOW portfolio</h2>
        <div className="mt-5 space-y-6">
          {data.sows.map((sow) => (
            <article key={sow.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">
                {sow.sowNumber} · {sow.engagementType} · {sow.status}
              </p>
              <h3 className="mt-2 text-lg font-black">{sow.title}</h3>
              <p className="mt-2 text-sm text-slate-500">
                {sow.supplier.tradingName ?? sow.supplier.legalName} · NTE $
                {Number(sow.notToExceedAmount).toLocaleString()}
              </p>

              <div className="mt-5 grid gap-5 xl:grid-cols-2">
                <form action={addServiceMilestoneAction} className="grid gap-3">
                  <input type="hidden" name="statementOfWorkId" value={sow.id} />
                  <input className={input} name="name" placeholder="Milestone" required />
                  <input className={input} name="description" placeholder="Description" />
                  <input className={input} name="dueAt" type="date" required />
                  <input className={input} name="amount" type="number" step="0.01" placeholder="Amount" required />
                  <button className="rounded-xl bg-blue-700 px-4 py-2.5 font-black text-white">
                    Add milestone
                  </button>
                </form>

                <form action={addServiceWorkerAction} className="grid gap-3">
                  <input type="hidden" name="statementOfWorkId" value={sow.id} />
                  <input className={input} name="workerReference" placeholder="Worker reference" required />
                  <input className={input} name="fullName" placeholder="Full name" required />
                  <input className={input} name="email" type="email" placeholder="Email" />
                  <input className={input} name="roleTitle" placeholder="Role title" required />
                  <input className={input} name="startsAt" type="date" required />
                  <input className={input} name="endsAt" type="date" />
                  <input className={input} name="hourlyRate" type="number" step="0.0001" placeholder="Hourly rate" />
                  <input className={input} name="dailyRate" type="number" step="0.0001" placeholder="Daily rate" />
                  <input className={input} name="maximumHours" type="number" step="0.01" placeholder="Maximum hours" />
                  <select className={input} name="managerUserId">
                    <option value="">Assign creator</option>
                    {data.members.map((membership) => (
                      <option key={membership.id} value={membership.userId}>
                        {membership.user.name ?? membership.user.email}
                      </option>
                    ))}
                  </select>
                  <button className="rounded-xl bg-emerald-700 px-4 py-2.5 font-black text-white">
                    Add worker
                  </button>
                </form>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sow.workers.map((worker) => (
                  <article key={worker.id} className="rounded-2xl bg-white p-5">
                    <p className="text-xs font-black text-blue-700">
                      {worker.status}
                    </p>
                    <h4 className="mt-2 font-black">{worker.fullName}</h4>
                    <p className="mt-1 text-sm text-slate-500">
                      {worker.roleTitle}
                    </p>
                    <form action={submitServiceTimeAction} className="mt-4 grid gap-2">
                      <input type="hidden" name="serviceWorkerId" value={worker.id} />
                      <input className={input} name="workDate" type="date" required />
                      <input className={input} name="hours" type="number" step="0.25" placeholder="Hours" required />
                      <input className={input} name="description" placeholder="Work description" required />
                      <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                        Submit time
                      </button>
                    </form>
                  </article>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Time approval queue</h2>
        <div className="mt-5 space-y-3">
          {data.timeEntries.map((entry) => (
            <article key={entry.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">
                {entry.status} · {entry.workDate.toLocaleDateString()}
              </p>
              <h3 className="mt-2 font-black">
                {entry.worker.fullName} — {entry.statementOfWork.title}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {entry.hours.toString()} hours · ${entry.amount.toString()}
              </p>
              {entry.status === "SUBMITTED" ? (
                <form action={approveServiceTimeAction} className="mt-4">
                  <input type="hidden" name="timeEntryId" value={entry.id} />
                  <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white">
                    Approve time
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  money = false,
}: {
  label: string;
  value: number;
  money?: boolean;
}) {
  return (
    <article className={card}>
      <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">
        {money ? `$${value.toLocaleString()}` : value}
      </p>
    </article>
  );
}
