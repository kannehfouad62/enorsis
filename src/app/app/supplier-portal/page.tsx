import {
  createOnboardingQuestionnaireAction,
  createSupplierPortalTaskAction,
  inviteSupplierPortalUserAction,
} from "@/modules/supplier-portal/actions";
import { getSupplierPortalWorkspace } from "@/modules/supplier-portal/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function SupplierPortalPage() {
  const data = await getSupplierPortalWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Supplier collaboration
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Supplier Portal & Onboarding
      </h1>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Active portal users" value={data.metrics.activePortalUsers} />
        <Metric label="Pending invitations" value={data.metrics.pendingInvitations} />
        <Metric label="Questionnaires due" value={data.metrics.questionnairesDue} />
        <Metric label="Awaiting review" value={data.metrics.submittedQuestionnaires} />
        <Metric label="Open tasks" value={data.metrics.openTasks} />
        <Metric label="Unread messages" value={data.metrics.unreadSupplierMessages} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className={card}>
          <h2 className="text-xl font-black">Invite supplier user</h2>
          <form action={inviteSupplierPortalUserAction} className="mt-5 grid gap-3">
            <select className={input} name="supplierId" required>
              <option value="">Select supplier</option>
              {data.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.tradingName ?? supplier.legalName}
                </option>
              ))}
            </select>
            <input className={input} name="contactName" placeholder="Contact name" />
            <input className={input} name="email" type="email" placeholder="Email" required />
            <input className={input} name="jobTitle" placeholder="Job title" />
            <input className={input} name="phone" placeholder="Phone" />
            <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
              Create invitation
            </button>
          </form>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Send questionnaire</h2>
          <form action={createOnboardingQuestionnaireAction} className="mt-5 grid gap-3">
            <select className={input} name="supplierId" required>
              <option value="">Select supplier</option>
              {data.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.tradingName ?? supplier.legalName}
                </option>
              ))}
            </select>
            <input className={input} name="title" placeholder="Questionnaire title" required />
            <textarea className={`${input} min-h-20`} name="description" placeholder="Description" />
            <textarea
              className={`${input} min-h-36`}
              name="questions"
              placeholder="Enter one question per line"
              required
            />
            <input className={input} name="dueAt" type="date" />
            <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
              Send questionnaire
            </button>
          </form>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Create collaboration task</h2>
          <form action={createSupplierPortalTaskAction} className="mt-5 grid gap-3">
            <select className={input} name="supplierId" required>
              <option value="">Select supplier</option>
              {data.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.tradingName ?? supplier.legalName}
                </option>
              ))}
            </select>
            <input className={input} name="title" placeholder="Task title" required />
            <textarea className={`${input} min-h-20`} name="description" placeholder="Task description" />
            <input className={input} name="dueAt" type="date" />
            <input className={input} name="supplierOwnerEmail" type="email" placeholder="Supplier owner email" />
            <button className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white">
              Create task
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className={card}>
      <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">{value.toLocaleString()}</p>
    </article>
  );
}
