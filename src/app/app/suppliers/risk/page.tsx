import Link from "next/link";
import { getSupplierRiskPortfolio } from "@/modules/supplier-risk/queries";

export default async function SupplierRiskPortfolioPage() {
  const { portfolio } = await getSupplierRiskPortfolio();
  const metrics = [
    ["High risk", portfolio.filter((supplier) => ["HIGH", "CRITICAL"].includes(supplier.riskTier)).length],
    ["Expired evidence", portfolio.filter((supplier) => supplier.expiredDocuments > 0).length],
    ["Open findings", portfolio.reduce((sum, supplier) => sum + supplier.openFindings, 0)],
    ["ESG assessed", portfolio.filter((supplier) => supplier.latestEsgAssessment).length],
  ] as const;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">Supplier intelligence</p>
      <h1 className="mt-3 text-4xl font-black">Risk and ESG Command Center</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {metrics.map(([label, value]) => (
          <article key={label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead><tr className="bg-slate-50"><th className="p-3">Supplier</th><th className="p-3">Risk</th><th className="p-3">Residual</th><th className="p-3">Findings</th><th className="p-3">Expired docs</th><th className="p-3">ESG</th><th className="p-3">Exposure</th></tr></thead>
          <tbody>
            {portfolio.map((supplier) => (
              <tr key={supplier.id} className="border-t border-slate-100">
                <td className="p-3"><Link className="font-black text-blue-700" href={`/app/suppliers/${supplier.id}/risk`}>{supplier.tradingName ?? supplier.legalName}</Link></td>
                <td className="p-3 font-black">{supplier.riskTier}</td>
                <td className="p-3">{supplier.latestAssessment?.residualRiskScore ?? "—"}</td>
                <td className="p-3">{supplier.openFindings}</td>
                <td className="p-3">{supplier.expiredDocuments}</td>
                <td className="p-3">{supplier.latestEsgAssessment?.rating ?? "NOT ASSESSED"}</td>
                <td className="p-3">{supplier.contractExposure.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
