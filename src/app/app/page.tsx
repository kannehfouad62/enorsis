import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SupplierCommandCenter } from "@/components/command-center/SupplierCommandCenter";
import { getSidebarActionCountsForUser } from "@/modules/navigation/sidebar-action-counts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Globe2,
  PackageCheck,
  ShieldAlert,
  Sparkles,
  UsersRound,
} from "lucide-react";

const metrics = [
  { label: "Addressable spend", value: "$48.6M", change: "+8.2%", icon: CircleDollarSign, positive: true },
  { label: "Savings pipeline", value: "$3.84M", change: "+14.6%", icon: Sparkles, positive: true },
  { label: "Active suppliers", value: "1,284", change: "+32", icon: UsersRound, positive: true },
  { label: "Risk exposure", value: "$1.12M", change: "-9.4%", icon: ShieldAlert, positive: true },
];

const activities = [
  { title: "Facilities sourcing event analyzed", detail: "14 compliant quotes compared across 6 weighted criteria", time: "4 min ago", icon: Bot },
  { title: "Purchase request PR-2048 awaits approval", detail: "$184,500 · Technology · North America", time: "19 min ago", icon: Clock3 },
  { title: "Supplier insurance renewed", detail: "Apex Industrial Services · Valid through July 2027", time: "1 hr ago", icon: PackageCheck },
  { title: "Contract obligation extracted", detail: "Annual pricing review identified in MSA-0092", time: "2 hrs ago", icon: FileCheck2 },
];

const regions = [
  { name: "North America", spend: "$21.4M", suppliers: 482, risk: "Low" },
  { name: "Europe", spend: "$14.8M", suppliers: 338, risk: "Moderate" },
  { name: "Asia Pacific", spend: "$8.9M", suppliers: 301, risk: "Moderate" },
  { name: "Africa & Middle East", spend: "$3.5M", suppliers: 163, risk: "Low" },
];

export default async function CommandCenterPage() {
  const session = await auth();

  if (!session?.user?.tenantId) redirect("/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { name: true, commercialPersona: true },
  });

  if (tenant?.commercialPersona === "SUPPLIER") {
    const actionCounts = await getSidebarActionCountsForUser({
      id: session.user.id,
      tenantId: session.user.tenantId,
      roles: session.user.roles,
      commercialPersona: tenant.commercialPersona,
    });

    return (
      <SupplierCommandCenter
        tenantName={tenant.name}
        actionCounts={actionCounts}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 xl:px-10 xl:py-10">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.24em] text-blue-700">Global procurement mission control</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl xl:text-5xl">Good evening, Platform Administrator.</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Your procurement network is operating normally. Three governed decisions require human attention.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold shadow-sm hover:bg-slate-50">Review approvals</button>
          <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-300 hover:bg-blue-700">Create purchase request</button>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {metrics.map(({ label, value, change, icon: Icon, positive }) => (
          <article key={label} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,.05)]">
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{change}
              </span>
            </div>
            <p className="mt-5 text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-black tracking-tight">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 2xl:grid-cols-[1.45fr_.75fr]">
        <article className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl shadow-slate-300/70">
          <div className="border-b border-white/10 px-6 py-5 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Live global operations</p>
              <h2 className="mt-1 text-xl font-black">Procurement network intelligence</h2>
            </div>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300 sm:mt-0">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" /> All systems operational
            </span>
          </div>
          <div className="relative min-h-[390px] overflow-hidden p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(37,99,235,.35),transparent_32%),linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:auto,34px_34px,34px_34px]" />
            <div className="relative grid gap-4 md:grid-cols-2">
              {regions.map((region) => (
                <div key={region.name} className="rounded-2xl border border-white/10 bg-white/[.06] p-5 backdrop-blur-xl transition hover:border-cyan-300/30 hover:bg-white/10">
                  <div className="flex items-center justify-between"><Globe2 className="h-5 w-5 text-cyan-300" /><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${region.risk === "Low" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{region.risk} risk</span></div>
                  <h3 className="mt-5 font-bold">{region.name}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-slate-500">Managed spend</p><p className="mt-1 text-lg font-black">{region.spend}</p></div><div><p className="text-slate-500">Suppliers</p><p className="mt-1 text-lg font-black">{region.suppliers}</p></div></div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,.05)]">
          <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">Governed AI</p><h2 className="mt-1 text-xl font-black">Agent activity</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white"><Bot className="h-5 w-5" /></span></div>
          <div className="mt-6 space-y-5">
            {activities.map(({ title, detail, time, icon: Icon }) => (
              <div key={title} className="flex gap-4 border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0"><p className="text-sm font-bold leading-5">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p><p className="mt-2 text-[11px] font-semibold text-blue-700">{time}</p></div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <article className="rounded-3xl border border-slate-200/80 bg-white p-6 lg:col-span-2">
          <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">Decision queue</p><h2 className="mt-1 text-xl font-black">Human approvals required</h2></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">3 pending</span></div>
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500"><th className="pb-3 font-bold">Decision</th><th className="pb-3 font-bold">Owner</th><th className="pb-3 font-bold">Value</th><th className="pb-3 font-bold">Due</th><th className="pb-3 font-bold">Risk</th></tr></thead><tbody>{[["Award facilities RFQ","M. Chen","$184,500","Today","Low"],["Approve software renewal","A. Johnson","$92,800","Tomorrow","Moderate"],["Release industrial PO","S. Mensah","$248,100","Aug 5","Low"]].map((row)=><tr key={row[0]} className="border-b border-slate-100 last:border-0"><td className="py-4 font-bold">{row[0]}</td><td className="py-4 text-slate-600">{row[1]}</td><td className="py-4 font-semibold">{row[2]}</td><td className="py-4 text-slate-600">{row[3]}</td><td className="py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{row[4]}</span></td></tr>)}</tbody></table></div>
        </article>
        <article className="rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 p-6 text-white shadow-xl shadow-blue-200">
          <Sparkles className="h-7 w-7" /><p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-blue-100">Enorsis opportunity</p><h2 className="mt-2 text-2xl font-black">$428K potential annual savings</h2><p className="mt-3 text-sm leading-6 text-blue-50">Consolidating four fragmented facilities categories could reduce unit cost and supplier-management effort.</p><button className="mt-8 w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-blue-700">Review recommendation</button>
        </article>
      </section>
    </div>
  );
}
