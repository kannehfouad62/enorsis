import Link from "next/link";
import { getRenewalWorkspace } from "@/modules/contracts/governance-queries";

export default async function ContractRenewalsPage() {
  const { contracts } = await getRenewalWorkspace();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Renewal intelligence
      </p>
      <h1 className="mt-3 text-4xl font-black">Upcoming renewals</h1>

      <div className="mt-8 space-y-4">
        {contracts.map((contract) => (
          <article
            key={contract.id}
            className="rounded-3xl border border-slate-200 bg-white p-6"
          >
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <p className="text-xs font-black text-blue-700">
                  {contract.contractNumber}
                </p>
                <h2 className="mt-2 text-xl font-black">{contract.title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {contract.supplier.tradingName ??
                    contract.supplier.legalName}
                </p>
              </div>
              <div className="text-right">
                <p className="font-black">
                  {contract.endDate?.toLocaleDateString() ?? "No end date"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Notice: {contract.renewalNoticeDays} days
                </p>
              </div>
            </div>
            <Link
              href={`/app/contracts/${contract.id}`}
              className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
            >
              Review contract
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
