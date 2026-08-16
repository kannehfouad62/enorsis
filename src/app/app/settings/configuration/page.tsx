import { updateTenantConfigurationAction } from "@/modules/tenant-configuration/actions";
import { getTenantConfigurationWorkspace } from "@/modules/tenant-configuration/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function TenantConfigurationPage() {
  const config = await getTenantConfigurationWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mt-3 text-4xl font-black">
        Tenant Enterprise Configuration
      </h1>

      <form
        action={updateTenantConfigurationAction}
        className="mt-8 space-y-6"
      >
        <Section title="Branding & identity">
          <Field name="displayName" label="Display name" value={config.displayName} />
          <Field name="legalName" label="Legal name" value={config.legalName} />
          <Field name="logoUrl" label="Logo URL" value={config.logoUrl} type="url" />
          <Field name="primaryColor" label="Primary color" value={config.primaryColor} />
          <Field name="secondaryColor" label="Secondary color" value={config.secondaryColor} />
          <Field name="customDomain" label="Custom domain" value={config.customDomain} />
        </Section>

        <Section title="Locale & fiscal calendar">
          <Field name="locale" label="Locale" value={config.locale} />
          <Field name="timeZone" label="Time zone" value={config.timeZone} />
          <Field name="defaultCurrencyCode" label="Default currency" value={config.defaultCurrencyCode} />
          <Field name="fiscalYearStartMonth" label="Fiscal start month" value={config.fiscalYearStartMonth} type="number" />
          <Field name="dateFormat" label="Date format" value={config.dateFormat} />
          <Field name="numberFormat" label="Number format" value={config.numberFormat} />
          <Field name="weekStartsOn" label="Week starts on" value={config.weekStartsOn} type="number" />
        </Section>

        <section className={card}>
          <h2 className="text-xl font-black">Hosting & residency</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label>
              <span className="text-sm font-bold">Environment</span>
              <select className={input} name="environmentType" defaultValue={config.environmentType}>
                <option>SHARED_SAAS</option>
                <option>DEDICATED_SAAS</option>
                <option>MANAGED_PAAS</option>
                <option>SELF_HOSTED</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-bold">Data residency</span>
              <select className={input} name="dataResidency" defaultValue={config.dataResidency}>
                <option>UNITED_STATES</option>
                <option>CANADA</option>
                <option>EUROPEAN_UNION</option>
                <option>UNITED_KINGDOM</option>
                <option>AUSTRALIA</option>
                <option>SINGAPORE</option>
                <option>GLOBAL</option>
                <option>CUSTOM</option>
              </select>
            </label>
            <Field name="customResidencyRegion" label="Custom region" value={config.customResidencyRegion} />
          </div>
        </section>

        <Section title="Security & retention">
          <Checkbox name="requireMfa" label="Require MFA" checked={config.requireMfa} />
          <Checkbox name="enforceSso" label="Enforce SSO" checked={config.enforceSso} />
          <Field name="sessionTimeoutMinutes" label="Session timeout minutes" value={config.sessionTimeoutMinutes} type="number" />
          <Field name="passwordMinLength" label="Minimum password length" value={config.passwordMinLength} type="number" />
          <Field name="documentRetentionDays" label="Document retention days" value={config.documentRetentionDays} type="number" />
          <Field name="auditRetentionDays" label="Audit retention days" value={config.auditRetentionDays} type="number" />
        </Section>

        <Section title="Notifications & limits">
          <Checkbox name="emailNotifications" label="Email notifications" checked={config.emailNotifications} />
          <Checkbox name="inAppNotifications" label="In-app notifications" checked={config.inAppNotifications} />
          <Checkbox name="dailyDigestEnabled" label="Daily digest" checked={config.dailyDigestEnabled} />
          <Field name="dailyDigestHour" label="Digest hour" value={config.dailyDigestHour} type="number" />
          <Field name="maxUsers" label="Maximum users" value={config.maxUsers} type="number" />
          <Field name="maxSuppliers" label="Maximum suppliers" value={config.maxSuppliers} type="number" />
          <Field name="maxStorageMb" label="Maximum storage MB" value={config.maxStorageMb?.toString()} type="number" />
          <Field name="maxApiRequestsPerMonth" label="Monthly API requests" value={config.maxApiRequestsPerMonth?.toString()} type="number" />
          <Field name="supportTier" label="Support tier" value={config.supportTier} />
          <Field name="maintenanceWindow" label="Maintenance window" value={config.maintenanceWindow} />
        </Section>

        <button className="rounded-xl bg-slate-950 px-6 py-3 font-black text-white">
          Save enterprise configuration
        </button>
      </form>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={card}>
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

function Field({
  name,
  label,
  value,
  type = "text",
}: {
  name: string;
  label: string;
  value: string | number | null | undefined;
  type?: string;
}) {
  return (
    <label>
      <span className="text-sm font-bold">{label}</span>
      <input className={input} name={name} type={type} defaultValue={value ?? ""} />
    </label>
  );
}

function Checkbox({
  name,
  label,
  checked,
}: {
  name: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <input type="checkbox" name={name} defaultChecked={checked} />
      <span className="text-sm font-bold">{label}</span>
    </label>
  );
}
