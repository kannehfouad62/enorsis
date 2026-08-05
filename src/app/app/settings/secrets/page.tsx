import {
  createVaultSecretAction,
  grantVaultServiceAccessAction,
  revokeVaultSecretAction,
  rotateVaultSecretAction,
} from "@/modules/secrets-vault/actions";
import { getSecretsVaultWorkspace } from "@/modules/secrets-vault/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function SecretsVaultPage() {
  const data = await getSecretsVaultWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Enterprise Foundation 1.0
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Secrets Vault & Credential Governance
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Store encrypted secrets, rotate versions, grant service access,
        monitor usage, and revoke credentials without exposing plaintext.
      </p>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Create encrypted secret</h2>
        <form
          action={createVaultSecretAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field name="key" label="Secret reference key" required />
          <Field name="name" label="Display name" required />
          <Field name="provider" label="Provider" />
          <Field name="environment" label="Environment" value="PRODUCTION" />
          <label>
            <span className="text-sm font-bold">Secret type</span>
            <select className={input} name="secretType">
              <option>API_KEY</option>
              <option>BEARER_TOKEN</option>
              <option>BASIC_AUTH</option>
              <option>OAUTH_CLIENT_SECRET</option>
              <option>PRIVATE_KEY</option>
              <option>CERTIFICATE</option>
              <option>SSH_KEY</option>
              <option>WEBHOOK_SECRET</option>
              <option>DATABASE_CREDENTIAL</option>
              <option>ENCRYPTION_KEY</option>
              <option>CUSTOM</option>
            </select>
          </label>
          <Field name="plaintext" label="Secret value" type="password" required />
          <Field name="expiresAt" label="Expires at" type="date" />
          <Field name="description" label="Description" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
            Encrypt and store
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Managed secrets</h2>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {data.secrets.map((secret) => (
            <article key={secret.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">
                {secret.status} · VERSION {secret.currentVersion}
              </p>
              <h3 className="mt-2 text-lg font-black">{secret.name}</h3>
              <p className="mt-1 font-mono text-xs text-slate-500">
                {secret.key}
              </p>
              <p className="mt-3 text-sm text-slate-600">
                {secret.provider ?? "Internal"} · {secret.environment} ·{" "}
                {secret.secretType}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Accessed {secret.accessCount} times ·{" "}
                {secret.versions.length} versions
              </p>

              <form
                action={rotateVaultSecretAction}
                className="mt-5 grid gap-3 md:grid-cols-2"
              >
                <input type="hidden" name="secretId" value={secret.id} />
                <Field
                  name="plaintext"
                  label="New secret value"
                  type="password"
                  required
                />
                <Field name="expiresAt" label="New expiry" type="date" />
                <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
                  Rotate secret
                </button>
              </form>

              {data.isPlatformOperator ? (
                <form
                  action={grantVaultServiceAccessAction}
                  className="mt-5 grid gap-3 md:grid-cols-2"
                >
                  <input type="hidden" name="secretId" value={secret.id} />
                  <Field
                    name="serviceKey"
                    label="Service key"
                    value="platform:integration-hub"
                    required
                  />
                  <label>
                    <span className="text-sm font-bold">Action</span>
                    <select className={input} name="action">
                      <option>READ</option>
                      <option>WRITE</option>
                      <option>ROTATE</option>
                      <option>REVOKE</option>
                    </select>
                  </label>
                  <Field name="expiresAt" label="Policy expiry" type="date" />
                  <button className="rounded-xl bg-white px-4 py-2 text-sm font-black ring-1 ring-slate-200">
                    Grant service access
                  </button>
                </form>
              ) : null}

              <form action={revokeVaultSecretAction} className="mt-5 flex gap-3">
                <input type="hidden" name="secretId" value={secret.id} />
                <input
                  className={input}
                  name="reason"
                  placeholder="Revocation reason"
                />
                <button className="rounded-xl bg-red-700 px-4 py-2 text-sm font-black text-white">
                  Revoke
                </button>
              </form>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                  Recent access
                </p>
                <div className="mt-2 space-y-2">
                  {secret.accessLogs.map((log) => (
                    <p key={log.id} className="text-xs text-slate-600">
                      {log.action} · {log.success ? "SUCCESS" : "DENIED"} ·{" "}
                      {log.createdAt.toLocaleString()}
                    </p>
                  ))}
                </div>
              </div>
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
        autoComplete={type === "password" ? "new-password" : undefined}
      />
    </label>
  );
}
