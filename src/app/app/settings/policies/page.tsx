import {
  createFeatureFlagAction,
  createPolicyDefinitionAction,
  setTenantFeatureFlagAction,
  setTenantPolicyAction,
} from "@/modules/policy-framework/actions";
import { getPolicyFrameworkWorkspace } from "@/modules/policy-framework/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function PolicyFrameworkPage() {
  const data = await getPolicyFrameworkWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Enterprise Foundation 1.0
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Enterprise Policy & Feature Controls
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Manage versioned platform policies, tenant overrides, controlled
        rollouts, commercial prerequisites, and Managed PaaS-only flags.
      </p>

      {data.isPlatformOperator ? (
        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <section className={card}>
            <h2 className="text-xl font-black">Create policy definition</h2>
            <form action={createPolicyDefinitionAction} className="mt-5 grid gap-4">
              <Field name="key" label="Policy key" required />
              <Field name="name" label="Name" required />
              <Field name="category" label="Category" required />
              <Field name="moduleKey" label="Module key" />
              <label>
                <span className="text-sm font-bold">Value type</span>
                <select className={input} name="valueType">
                  <option>BOOLEAN</option>
                  <option>STRING</option>
                  <option>NUMBER</option>
                  <option>JSON</option>
                </select>
              </label>
              <Field name="defaultValue" label="Default value" required />
              <Field name="description" label="Description" />
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <input type="checkbox" name="managedByPlatform" />
                <span className="text-sm font-bold">Platform managed</span>
              </label>
              <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
                Create policy
              </button>
            </form>
          </section>

          <section className={card}>
            <h2 className="text-xl font-black">Create feature flag</h2>
            <form action={createFeatureFlagAction} className="mt-5 grid gap-4">
              <Field name="key" label="Flag key" required />
              <Field name="name" label="Name" required />
              <Field name="moduleKey" label="Module key" />
              <Field name="requiresFeatureKey" label="Required feature key" />
              <Field name="rolloutPercentage" label="Rollout percentage" value="0" type="number" />
              <Field name="description" label="Description" />
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <input type="checkbox" name="defaultEnabled" />
                <span className="text-sm font-bold">Enabled by default</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <input type="checkbox" name="managedPaaSOnly" />
                <span className="text-sm font-bold">Managed PaaS only</span>
              </label>
              <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
                Create feature flag
              </button>
            </form>
          </section>
        </div>
      ) : null}

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Tenant policy values</h2>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {data.policies.map((policy) => (
            <article key={policy.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">
                {policy.category} · {policy.valueType}
              </p>
              <h3 className="mt-2 text-lg font-black">{policy.name}</h3>
              <p className="mt-1 font-mono text-xs text-slate-500">{policy.key}</p>
              <form action={setTenantPolicyAction} className="mt-4 grid gap-3">
                <input type="hidden" name="policyDefinitionId" value={policy.id} />
                <Field
                  name="value"
                  label="Tenant value"
                  value={
                    policy.tenantOverrides[0]
                      ? JSON.stringify(policy.tenantOverrides[0].value)
                      : JSON.stringify(policy.defaultValue)
                  }
                  required
                />
                <Field name="reason" label="Reason" />
                <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                  Save policy override
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Tenant feature flags</h2>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {data.flags.map((flag) => (
            <article key={flag.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">
                {flag.status} · {flag.rolloutPercentage}% rollout
              </p>
              <h3 className="mt-2 text-lg font-black">{flag.name}</h3>
              <p className="mt-1 font-mono text-xs text-slate-500">{flag.key}</p>
              <form action={setTenantFeatureFlagAction} className="mt-4 grid gap-3">
                <input type="hidden" name="featureFlagId" value={flag.id} />
                <select
                  className={input}
                  name="enabled"
                  defaultValue={
                    flag.tenantOverrides[0]
                      ? String(flag.tenantOverrides[0].enabled)
                      : String(flag.defaultEnabled)
                  }
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
                <Field name="reason" label="Reason" />
                <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
                  Save flag override
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({
  name,
  label,
  value,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  value?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-sm font-bold">{label}</span>
      <input
        className={input}
        name={name}
        type={type}
        defaultValue={value}
        required={required}
      />
    </label>
  );
}
