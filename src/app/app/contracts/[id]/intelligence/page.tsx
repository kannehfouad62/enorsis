import Link from "next/link";
import { ResourceIntelligencePanel } from "@/components/ai/ResourceIntelligencePanel";
import { reviewContractWithAiAction } from "@/modules/ai/context-actions";
import { getResourceAiExecutions } from "@/modules/ai/resource-queries";
import { getContractDetail } from "@/modules/contracts/queries";

export default async function ContractIntelligencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ contract }, { executions }] = await Promise.all([
    getContractDetail(id),
    getResourceAiExecutions("Contract", id),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href={`/app/contracts/${id}`} className="font-black text-blue-700">
        ← Contract
      </Link>
      <h1 className="mt-5 text-4xl font-black">Contract intelligence</h1>
      <p className="mt-2 text-slate-600">
        {contract.contractNumber} · {contract.title}
      </p>

      <form
        action={reviewContractWithAiAction}
        className="mt-8 rounded-3xl border border-slate-200 bg-white p-6"
      >
        <input type="hidden" name="contractId" value={id} />
        <textarea
          className="min-h-36 w-full rounded-xl border border-slate-200 px-4 py-3"
          name="instruction"
          placeholder="Optional contract-review focus, thresholds or negotiation position"
        />
        <button className="mt-3 rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
          Generate governed contract review
        </button>
      </form>

      <div className="mt-6">
        <ResourceIntelligencePanel executions={executions} />
      </div>
    </div>
  );
}
