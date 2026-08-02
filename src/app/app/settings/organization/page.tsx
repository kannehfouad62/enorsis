import { Building2, CheckCircle2, Globe2, Landmark, ShieldCheck } from "lucide-react";

const configuration = [
  { label: "Organization", value: "Northstar Global", icon: Building2 },
  { label: "Primary country", value: "United States", icon: Globe2 },
  { label: "Base reporting currency", value: "USD", icon: Landmark },
  { label: "Currency policy", value: "USD with local display", icon: ShieldCheck },
];

export default function OrganizationSettingsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 xl:px-10 xl:py-12">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">Tenant administration</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">Organization configuration</h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">Review the active tenant context, reporting standard and enterprise governance defaults. Database-backed editing arrives with the onboarding workflow.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {configuration.map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></span>
            <p className="mt-5 text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-black">{value}</p>
          </article>
        ))}
      </div>

      <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex gap-4"><CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-emerald-700" /><div><h2 className="text-lg font-black text-emerald-950">Tenant context is active</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-800">Protected product routes now resolve an authenticated tenant identity. Procurement records introduced in later patches will derive tenant ownership from this server-side context rather than from browser-submitted identifiers.</p></div></div>
      </section>
    </div>
  );
}
