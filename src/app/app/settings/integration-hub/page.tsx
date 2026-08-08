import {
  ENTERPRISE_INTEGRATION_PROVIDER_PROFILES,
  getEnterpriseIntegrationProviderProfile,
} from "@/core/integrations";
import {
  addConnectorCredentialAction,
  createConnectorConnectionAction,
  createConnectorMappingAction,
  healthCheckConnectorAction,
  queueConnectorSyncAction,
  seedConnectorCatalogAction,
} from "@/modules/integration-hub/actions";
import { getIntegrationHubWorkspace } from "@/modules/integration-hub/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function IntegrationHubPage() {
  const data = await getIntegrationHubWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Phase B2.9.2.12
      </p>
      <h1 className="mt-3 text-4xl font-black">
        Enterprise Integration Hub
      </h1>
      <p className="mt-3 max-w-4xl leading-7 text-slate-600">
        Governed ERP and source-to-pay connectivity for SAP,
        Oracle, Microsoft Dynamics, Coupa and SAP Ariba, with
        tenant-scoped credentials, object mappings, health checks
        and durable synchronization.
      </p>

      <form action={seedConnectorCatalogAction} className="mt-6">
        <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
          Initialize enterprise connector catalog
        </button>
      </form>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ENTERPRISE_INTEGRATION_PROVIDER_PROFILES.filter(
          (profile) =>
            profile.definitionKey !== "generic-rest",
        ).map((profile) => (
          <article key={profile.definitionKey} className={card}>
            <p className="text-xs font-black uppercase text-blue-700">
              {profile.family.replaceAll("_", " ")}
            </p>
            <h2 className="mt-2 text-xl font-black">
              {profile.name}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {profile.supportedObjects.join(" · ")}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Credentials: {profile.credentialTypes.join(", ")}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {profile.endpointHint}
            </p>
          </article>
        ))}
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Create connection</h2>
        <form
          action={createConnectorConnectionAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <label>
            <span className="text-sm font-bold">Connector</span>
            <select className={input} name="connectorDefinitionId" required>
              <option value="">Select connector</option>
              {data.definitions.map((definition) => (
                <option key={definition.id} value={definition.id}>
                  {definition.provider} — {definition.name}
                </option>
              ))}
            </select>
          </label>
          <Field name="name" label="Connection name" required />
          <Field name="environment" label="Environment" value="PRODUCTION" />
          <Field name="baseUrl" label="Base URL" type="url" />
          <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">
            Create connection
          </button>
        </form>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Connections</h2>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          {data.connections.map((connection) => {
            const profile =
              getEnterpriseIntegrationProviderProfile(
                connection.connectorDefinition.key,
              );

            return (
              <article
                key={connection.id}
                className="rounded-2xl bg-slate-50 p-5"
              >
                <p className="text-xs font-black text-blue-700">
                  {connection.status} · {connection.healthStatus}
                </p>
                <h3 className="mt-2 text-lg font-black">
                  {connection.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {connection.connectorDefinition.provider} —{" "}
                  {connection.connectorDefinition.name}
                </p>

                {profile ? (
                  <div className="mt-4 rounded-xl bg-white p-3 text-xs text-slate-600">
                    <p className="font-black text-slate-900">
                      Supported enterprise objects
                    </p>
                    <p className="mt-1">
                      {profile.supportedObjects.join(" · ")}
                    </p>
                    <p className="mt-2">
                      {profile.notes}
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <form action={queueConnectorSyncAction}>
                    <input
                      type="hidden"
                      name="connectionId"
                      value={connection.id}
                    />
                    <label>
                      <span className="text-sm font-bold">
                        Mapping
                      </span>
                      <select className={input} name="mappingId">
                        <option value="">All/default mapping</option>
                        {connection.mappings
                          .filter((mapping) => mapping.active)
                          .map((mapping) => (
                            <option
                              key={mapping.id}
                              value={mapping.id}
                            >
                              {mapping.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <select className={input} name="direction">
                      <option>INBOUND</option>
                      <option>OUTBOUND</option>
                      <option>BIDIRECTIONAL</option>
                    </select>
                    <button className="mt-3 rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
                      Queue governed sync
                    </button>
                  </form>

                  <form action={healthCheckConnectorAction}>
                    <input
                      type="hidden"
                      name="connectionId"
                      value={connection.id}
                    />
                    <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                      Run health check
                    </button>
                  </form>
                </div>

                <form
                  action={addConnectorCredentialAction}
                  className="mt-5 grid gap-3 md:grid-cols-2"
                >
                  <input
                    type="hidden"
                    name="connectionId"
                    value={connection.id}
                  />
                  <Field
                    name="name"
                    label="Credential name"
                    required
                  />
                  <label>
                    <span className="text-sm font-bold">
                      Credential type
                    </span>
                    <select className={input} name="credentialType">
                      <option>API_KEY</option>
                      <option>BEARER_TOKEN</option>
                      <option>BASIC_AUTH</option>
                      <option>OAUTH2</option>
                      <option>CLIENT_CERTIFICATE</option>
                      <option>SSH_KEY</option>
                      <option>DATABASE_CREDENTIAL</option>
                      <option>CUSTOM</option>
                    </select>
                  </label>
                  <Field
                    name="secretReference"
                    label="Secret reference"
                    required
                  />
                  <Field
                    name="expiresAt"
                    label="Expires at"
                    type="date"
                  />
                  <button className="rounded-xl bg-white px-4 py-2 text-sm font-black ring-1 ring-slate-200">
                    Add credential reference
                  </button>
                </form>

                <form
                  action={createConnectorMappingAction}
                  className="mt-5 grid gap-3 md:grid-cols-2"
                >
                  <input
                    type="hidden"
                    name="connectionId"
                    value={connection.id}
                  />
                  <Field
                    name="name"
                    label="Mapping name"
                    required
                  />
                  <Field
                    name="sourceObject"
                    label="Source object"
                    required
                  />
                  <Field
                    name="targetObject"
                    label="Enorsis target object"
                    required
                  />
                  <label>
                    <span className="text-sm font-bold">
                      Direction
                    </span>
                    <select className={input} name="direction">
                      <option>INBOUND</option>
                      <option>OUTBOUND</option>
                      <option>BIDIRECTIONAL</option>
                    </select>
                  </label>
                  <label className="md:col-span-2">
                    <span className="text-sm font-bold">
                      Field mappings JSON
                    </span>
                    <textarea
                      className={input}
                      name="fieldMappings"
                      rows={4}
                      defaultValue={'{"externalId":"id"}'}
                      required
                    />
                  </label>
                  <label className="md:col-span-2">
                    <span className="text-sm font-bold">
                      Transformation rules JSON
                    </span>
                    <textarea
                      className={input}
                      name="transformationRules"
                      rows={3}
                      defaultValue="{}"
                    />
                  </label>
                  <button className="rounded-xl bg-white px-4 py-2 text-sm font-black ring-1 ring-slate-200">
                    Create object mapping
                  </button>
                </form>

                {connection.mappings.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {connection.mappings.map((mapping) => (
                      <div
                        key={mapping.id}
                        className="rounded-xl bg-white p-3 text-xs"
                      >
                        <p className="font-black">
                          {mapping.name}
                        </p>
                        <p className="mt-1 text-slate-500">
                          {mapping.sourceObject} →{" "}
                          {mapping.targetObject} ·{" "}
                          {mapping.direction}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <p className="mt-4 text-xs text-slate-500">
                  {connection.credentials.length} credential references ·{" "}
                  {connection.mappings.length} mappings
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">
          Recent synchronization runs
        </h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Connection</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Written</th>
                <th className="px-4 py-3">Failed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.syncRuns.map((run) => (
                <tr key={run.id}>
                  <td className="px-4 py-3 font-bold">
                    {run.connection.name}
                  </td>
                  <td className="px-4 py-3">
                    {run.direction}
                  </td>
                  <td className="px-4 py-3">
                    {run.status}
                  </td>
                  <td className="px-4 py-3">
                    {run.recordsWritten}
                  </td>
                  <td className="px-4 py-3">
                    {run.recordsFailed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
