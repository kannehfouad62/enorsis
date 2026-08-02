import {
  Building2,
  CheckCircle2,
  Globe2,
  Landmark,
  MapPin,
  Network,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  bootstrapOrganizationAction,
  createDepartmentAction,
  createLegalEntityAction,
  createSiteAction,
  updateCurrencyPolicyAction,
} from "@/modules/organization/actions";
import { getOrganizationWorkspace } from "@/modules/organization/queries";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const buttonClass =
  "rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700";

export default async function OrganizationSettingsPage() {
  const { session, tenant } = await getOrganizationWorkspace();

  if (!tenant) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 xl:px-10 xl:py-12">
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          Tenant onboarding
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">
          Activate your organization workspace
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Create the database-backed tenant, owner membership, reporting
          standard and immutable onboarding audit record.
        </p>

        <form
          action={bootstrapOrganizationAction}
          className="mt-8 grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2"
        >
          <label className="text-sm font-bold text-slate-700">
            Organization name
            <input
              className={inputClass}
              name="name"
              defaultValue={session.user.tenantName}
              required
            />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Legal name
            <input
              className={inputClass}
              name="legalName"
              defaultValue={session.user.tenantName}
              required
            />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Country code
            <input
              className={inputClass}
              name="countryCode"
              defaultValue="US"
              maxLength={2}
              required
            />
          </label>
          <label className="text-sm font-bold text-slate-700">
            Base currency
            <input
              className={inputClass}
              name="baseCurrencyCode"
              defaultValue="USD"
              maxLength={3}
              required
            />
          </label>
          <div className="sm:col-span-2">
            <button className={buttonClass} type="submit">
              Activate organization
            </button>
          </div>
        </form>
      </div>
    );
  }

  const configuration = [
    { label: "Organization", value: tenant.name, icon: Building2 },
    { label: "Primary country", value: tenant.countryCode ?? "Not set", icon: Globe2 },
    { label: "Base reporting currency", value: tenant.baseCurrencyCode, icon: Landmark },
    { label: "Currency policy", value: tenant.currencyPolicyMode.replaceAll("_", " "), icon: ShieldCheck },
    { label: "Legal entities", value: String(tenant.legalEntities.length), icon: Network },
    { label: "Operating sites", value: String(tenant.sites.length), icon: MapPin },
    { label: "Departments", value: String(tenant.departments.length), icon: Building2 },
    { label: "Members", value: String(tenant.memberships.length), icon: Users },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 xl:px-10 xl:py-12">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Tenant administration
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">
        Organization configuration
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Manage the legal and operational structure that will govern sourcing,
        approvals, supplier access, financial commitments and reporting.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {configuration.map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-5 text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-black capitalize">{value}</p>
          </article>
        ))}
      </div>

      <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex gap-4">
          <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-emerald-700" />
          <div>
            <h2 className="text-lg font-black text-emerald-950">
              Database-backed tenant active
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-800">
              The active organization is resolved from the authenticated
              server session. New records below are automatically assigned to
              tenant {tenant.slug}.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <WorkspaceForm title="Currency and reporting policy">
          <form action={updateCurrencyPolicyAction} className="grid gap-4 sm:grid-cols-2">
            <Field label="Policy mode">
              <select
                className={inputClass}
                name="currencyPolicyMode"
                defaultValue={tenant.currencyPolicyMode}
              >
                <option value="USD_ONLY">USD only</option>
                <option value="USD_WITH_LOCAL_DISPLAY">USD with local display</option>
                <option value="TENANT_BASE_CURRENCY">Tenant base currency</option>
              </select>
            </Field>
            <Field label="Base currency">
              <input className={inputClass} name="baseCurrencyCode" defaultValue={tenant.baseCurrencyCode} maxLength={3} />
            </Field>
            <Field label="Local display currency">
              <input className={inputClass} name="localDisplayCurrency" defaultValue={tenant.localDisplayCurrency ?? ""} maxLength={3} placeholder="EUR" />
            </Field>
            <FormSubmit label="Update currency policy" />
          </form>
        </WorkspaceForm>

        <WorkspaceForm title="Add legal entity">
          <form action={createLegalEntityAction} className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name"><input className={inputClass} name="name" required /></Field>
            <Field label="Legal name"><input className={inputClass} name="legalName" required /></Field>
            <Field label="Country code"><input className={inputClass} name="countryCode" maxLength={2} required /></Field>
            <Field label="Base currency"><input className={inputClass} name="baseCurrencyCode" defaultValue={tenant.baseCurrencyCode} maxLength={3} required /></Field>
            <Field label="Registration number"><input className={inputClass} name="registrationNumber" /></Field>
            <FormSubmit label="Create legal entity" />
          </form>
        </WorkspaceForm>

        <WorkspaceForm title="Add operating site">
          <form action={createSiteAction} className="grid gap-4 sm:grid-cols-2">
            <Field label="Site code"><input className={inputClass} name="code" required /></Field>
            <Field label="Site name"><input className={inputClass} name="name" required /></Field>
            <Field label="Legal entity">
              <select className={inputClass} name="legalEntityId" defaultValue="">
                <option value="">Tenant level</option>
                {tenant.legalEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
              </select>
            </Field>
            <Field label="Country code"><input className={inputClass} name="countryCode" maxLength={2} required /></Field>
            <Field label="City"><input className={inputClass} name="city" /></Field>
            <Field label="Time zone"><input className={inputClass} name="timeZone" defaultValue={tenant.defaultTimeZone} required /></Field>
            <FormSubmit label="Create site" />
          </form>
        </WorkspaceForm>

        <WorkspaceForm title="Add department">
          <form action={createDepartmentAction} className="grid gap-4 sm:grid-cols-2">
            <Field label="Department code"><input className={inputClass} name="code" required /></Field>
            <Field label="Department name"><input className={inputClass} name="name" required /></Field>
            <Field label="Legal entity">
              <select className={inputClass} name="legalEntityId" defaultValue="">
                <option value="">Tenant level</option>
                {tenant.legalEntities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
              </select>
            </Field>
            <Field label="Site">
              <select className={inputClass} name="siteId" defaultValue="">
                <option value="">All sites</option>
                {tenant.sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
            </Field>
            <FormSubmit label="Create department" />
          </form>
        </WorkspaceForm>
      </div>
    </div>
  );
}

function WorkspaceForm({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return <label className="text-sm font-bold text-slate-700">{label}{children}</label>;
}

function FormSubmit({ label }: { label: string }) {
  return (
    <div className="flex items-end">
      <button className={buttonClass} type="submit">{label}</button>
    </div>
  );
}
