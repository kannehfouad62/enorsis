import Link from "next/link";
import { AlertTriangle, Boxes, PackageSearch, ShieldAlert, Warehouse } from "lucide-react";
import { generatePredictiveInventoryOptimizationAction } from "@/modules/predictive-inventory/actions";
import { getPredictiveInventoryWorkspace } from "@/modules/predictive-inventory/queries";

const card = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function PredictiveInventoryPage() {
  const data = await getPredictiveInventoryWorkspace();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">B8.2 · Predictive Procurement</p>
          <h1 className="mt-3 text-4xl font-black">Inventory Optimization & Reorder Intelligence</h1>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">Predict stockout exposure, optimize reorder points and safety stock, identify excess inventory and recommend replenishment quantities using existing Enorsis inventory and demand-planning evidence.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/inventory" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black">Inventory</Link>
          <Link href="/app/replenishment" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black">Replenishment</Link>
          <Link href="/app/demand-planning" className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Demand Planning</Link>
        </div>
      </div>

      <section className={`${card} mt-8`}>
        <div className="flex items-center gap-2"><Warehouse className="h-5 w-5 text-blue-700" /><h2 className="text-xl font-black">Generate inventory optimization</h2></div>
        <form action={generatePredictiveInventoryOptimizationAction} className="mt-5 flex flex-wrap items-end gap-3">
          <label className="text-xs font-black uppercase text-slate-500">Planning horizon
            <select className={`${input} mt-2 block`} name="horizonDays" defaultValue="90">
              <option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option><option value="180">180 days</option><option value="365">365 days</option>
            </select>
          </label>
          <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white">Generate optimization</button>
        </form>
      </section>

      {data.latestRun ? (<>
        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Items analyzed" value={data.metrics.totalItems} /><Metric label="Urgent reorders" value={data.metrics.urgentReorders} /><Metric label="Reorder candidates" value={data.metrics.reorderCandidates} /><Metric label="High stockout risk" value={data.metrics.highStockoutRisk} /><Metric label="Excess items" value={data.metrics.excessItems} /><Metric label="Excess value" value={`$${data.metrics.excessValue.toLocaleString(undefined,{maximumFractionDigits:0})}`} />
        </section>
        <section className={`${card} mt-8`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-slate-500">Latest optimization · {data.latestRun.modelVersion}</p><h2 className="mt-1 text-xl font-black">{data.latestRun.horizonDays}-day inventory horizon</h2></div><p className="text-xs text-slate-500">Generated {data.latestRun.generatedAt.toLocaleString()}</p></div>
          <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Available</th><th className="px-4 py-3">Days supply</th><th className="px-4 py-3">Stockout risk</th><th className="px-4 py-3">Current ROP</th><th className="px-4 py-3">Predicted ROP</th><th className="px-4 py-3">Recommended safety</th><th className="px-4 py-3">Suggested reorder</th><th className="px-4 py-3">Excess qty</th><th className="px-4 py-3">Recommendation</th></tr></thead><tbody className="divide-y divide-slate-100">
            {data.signals.map((signal)=><tr key={signal.id}><td className="px-4 py-3"><p className="font-black">{signal.sku}</p><p className="text-xs text-slate-500">{signal.itemName}</p></td><NumberCell value={signal.currentAvailable}/><NumberCell value={signal.daysOfSupply}/><td className="px-4 py-3 font-black">{Number(signal.stockoutProbability).toFixed(0)}%</td><NumberCell value={signal.currentReorderPoint}/><NumberCell value={signal.predictedReorderPoint}/><NumberCell value={signal.recommendedSafetyStock}/><NumberCell value={signal.suggestedReorderQty}/><NumberCell value={signal.excessQuantity}/><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{signal.recommendation.replaceAll("_"," ")}</span></td></tr>)}
          </tbody></table></div>
        </section>
        <section className="mt-8 grid gap-6 xl:grid-cols-2">
          <div className={card}><div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-rose-700"/><h2 className="text-xl font-black">Highest stockout exposure</h2></div><div className="mt-4 space-y-3">{data.signals.filter((s)=>Number(s.stockoutProbability)>=40).slice(0,10).map((s)=><SignalCard key={s.id} title={`${s.sku} — ${s.itemName}`} detail={`${Number(s.stockoutProbability).toFixed(0)}% stockout probability · ${Number(s.suggestedReorderQty).toLocaleString()} suggested reorder`}/>)}</div></div>
          <div className={card}><div className="flex items-center gap-2"><Boxes className="h-5 w-5 text-amber-700"/><h2 className="text-xl font-black">Excess inventory opportunities</h2></div><div className="mt-4 space-y-3">{data.signals.filter((s)=>Number(s.excessQuantity)>0).sort((a,b)=>Number(b.excessValue)-Number(a.excessValue)).slice(0,10).map((s)=><SignalCard key={s.id} title={`${s.sku} — ${s.itemName}`} detail={`${Number(s.excessQuantity).toLocaleString()} excess units · $${Number(s.excessValue).toLocaleString(undefined,{maximumFractionDigits:0})} estimated excess value`}/>)}</div></div>
        </section>
      </>) : <section className={`${card} mt-8`}><PackageSearch className="h-6 w-6 text-slate-400"/><p className="mt-3 text-sm text-slate-600">No predictive inventory optimization has been generated yet.</p></section>}

      <section className={`${card} mt-8`}><h2 className="text-xl font-black">Optimization run history</h2><div className="mt-4 space-y-3">{data.runs.map((run)=><article key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"><div><p className="font-black">{run.horizonDays}-day optimization</p><p className="mt-1 text-xs text-slate-500">{run.modelVersion} · {run.status}</p></div><p className="text-xs text-slate-500">{run.generatedAt.toLocaleString()}</p></article>)}</div></section>
      <div className="mt-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><p>B8.2 recommendations do not modify InventoryItem policies or create replenishment orders automatically. Review the recommendation in Replenishment and Demand Planning before taking operational action.</p></div>
    </div>
  );
}

function NumberCell({value}:{value:unknown}) { return <td className="px-4 py-3">{value===null||value===undefined?"—":Number(value).toLocaleString(undefined,{maximumFractionDigits:2})}</td>; }
function SignalCard({title,detail}:{title:string;detail:string}) { return <article className="rounded-2xl bg-slate-50 p-4"><p className="font-black">{title}</p><p className="mt-1 text-sm text-slate-600">{detail}</p></article>; }
function Metric({label,value}:{label:string;value:string|number}) { return <article className={card}><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></article>; }
