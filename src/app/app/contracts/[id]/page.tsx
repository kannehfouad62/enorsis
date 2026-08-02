import Link from "next/link";
import {
  addContractClauseAction,
  addContractObligationAction,
  uploadContractDocumentAction,
} from "@/modules/contracts/actions";
import { getContractDetail } from "@/modules/contracts/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { contract, members } = await getContractDetail(id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link href="/app/contracts" className="font-black text-blue-700">
        ← Contracts
      </Link>

      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-7">
        <p className="text-xs font-black text-blue-700">
          {contract.contractNumber}
        </p>
        <h1 className="mt-2 text-3xl font-black">{contract.title}</h1>
        <p className="mt-2 text-slate-500">
          {contract.supplier.tradingName ?? contract.supplier.legalName}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <Summary label="Status" value={contract.status} />
          <Summary label="Risk" value={contract.riskLevel} />
          <Summary
            label="Value"
            value={`${contract.currencyCode} ${contract.totalValue?.toString() ?? "—"}`}
          />
          <Summary
            label="End date"
            value={contract.endDate?.toLocaleDateString() ?? "Not set"}
          />
        </div>

        <section className="mt-6 rounded-2xl bg-slate-50 p-5">
          <h2 className="text-xl font-black">Clauses</h2>
          <form
            action={addContractClauseAction}
            className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <input type="hidden" name="contractId" value={contract.id} />
            <input className={input} name="name" placeholder="Clause name" required />
            <input className={input} name="category" placeholder="Category" required />
            <select className={input} name="riskLevel" defaultValue="STANDARD">
              <option value="STANDARD">Standard</option>
              <option value="REVIEW">Review</option>
              <option value="HIGH">High</option>
              <option value="PROHIBITED">Prohibited</option>
            </select>
            <textarea
              className={`${input} min-h-28 md:col-span-2 xl:col-span-4`}
              name="body"
              placeholder="Clause text"
              required
            />
            <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">
              Add clause
            </button>
          </form>

          <div className="mt-5 space-y-3">
            {contract.clauses.map((clause) => (
              <article key={clause.id} className="rounded-2xl bg-white p-4">
                <p className="font-black">{clause.name}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  {clause.category} · {clause.riskLevel}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                  {clause.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 p-5">
          <h2 className="text-xl font-black">Obligations</h2>
          <form
            action={addContractObligationAction}
            className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <input type="hidden" name="contractId" value={contract.id} />
            <input className={input} name="title" placeholder="Obligation title" required />
            <select className={input} name="ownerUserId">
              <option value="">No owner assigned</option>
              {members.map((membership) => (
                <option key={membership.id} value={membership.userId}>
                  {membership.user.name ?? membership.user.email}
                </option>
              ))}
            </select>
            <input className={input} name="dueDate" type="date" />
            <input className={input} name="recurrenceRule" placeholder="Recurrence rule" />
            <textarea
              className={`${input} min-h-24 md:col-span-2 xl:col-span-4`}
              name="description"
              placeholder="Description"
            />
            <label className="flex items-center gap-2 text-sm font-bold">
              <input name="recurring" type="checkbox" />
              Recurring obligation
            </label>
            <button className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white">
              Add obligation
            </button>
          </form>

          <div className="mt-5 space-y-3">
            {contract.obligations.map((obligation) => (
              <div key={obligation.id} className="rounded-2xl bg-slate-50 p-4">
                <p className="font-black">{obligation.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {obligation.status} ·{" "}
                  {obligation.dueDate?.toLocaleDateString() ?? "No due date"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 p-5">
          <h2 className="text-xl font-black">Private documents</h2>
          <form
            action={uploadContractDocumentAction}
            className="mt-4 flex flex-wrap gap-3"
          >
            <input type="hidden" name="contractId" value={contract.id} />
            <select className={input} name="type" defaultValue="DRAFT">
              <option value="DRAFT">Draft</option>
              <option value="EXECUTED">Executed</option>
              <option value="AMENDMENT">Amendment</option>
              <option value="EXHIBIT">Exhibit</option>
              <option value="SUPPORTING">Supporting</option>
            </select>
            <input
              className={input}
              name="file"
              type="file"
              accept=".pdf,.docx"
              required
            />
            <button className="self-end rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">
              Upload document
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {contract.documents.map((document) => (
              <a
                key={document.id}
                href={`/api/contracts/documents/${document.id}`}
                className="block rounded-xl bg-slate-50 p-3 text-sm font-semibold text-blue-700"
              >
                {document.name} · {document.type}
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 font-black">{value}</p>
    </div>
  );
}
