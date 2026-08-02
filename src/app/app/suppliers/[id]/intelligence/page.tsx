import Link from "next/link";
import { ResourceIntelligencePanel } from "@/components/ai/ResourceIntelligencePanel";
import { analyzeSupplierAction } from "@/modules/ai/context-actions";
import { getResourceAiExecutions } from "@/modules/ai/resource-queries";
import { getSupplierDetail } from "@/modules/suppliers/queries";

export default async function SupplierIntelligencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ supplier }, { executions }] = await Promise.all([
    getSupplierDetail(id),
    getResourceAiExecutions("Supplier", id),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link href={`/app/suppliers/${id}`} className="font-black text-blue-700">
        ← Supplier
      </Link>
      <h1 className="mt-5 text-4xl font-black">Supplier intelligence</h1>
      <p className="mt-2 text-slate-600">
        {supplier.supplierNumber} ·{" "}
        {supplier.tradingName ?? supplier.legalName}
      </p>

      <form
        action={analyzeSupplierAction}
        className="mt-8 rounded-3xl border border-slate-200 bg-white p-6"
      >
        <input type="hidden" name="supplierId" value={id} />
        <textarea
          className="min-h-32 w-full rounded-xl border border-slate-200 px-4 py-3"
          name="instruction"
          placeholder="Optional instructions for this supplier analysis"
        />
        <button className="mt-3 rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
          Generate supplier due-diligence brief
        </button>
      </form>

      <div className="mt-6">
        <ResourceIntelligencePanel executions={executions} />
      </div>
    </div>
  );
}
