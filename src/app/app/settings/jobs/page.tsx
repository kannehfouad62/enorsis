import {
  changePlatformJobStatusAction,
  createPlatformJobDefinitionAction,
  queuePlatformJobAction,
} from "@/modules/platform-jobs/actions";
import { getPlatformJobsWorkspace } from "@/modules/platform-jobs/queries";

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function PlatformJobsPage() {
  const data = await getPlatformJobsWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mt-3 text-4xl font-black">
        Background Job Platform
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Register, queue, retry, monitor, pause, and audit background jobs
        through one governed processing service.
      </p>

      {data.isPlatformOperator ? (
        <section className={`${card} mt-8`}>
          <h2 className="text-xl font-black">Register job definition</h2>
          <form
            action={createPlatformJobDefinitionAction}
            className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            <Field name="key" label="Job key" required />
            <Field name="name" label="Name" required />
            <Field name="handlerKey" label="Handler key" required />
            <Field name="scheduleExpression" label="Schedule expression" />
            <Field name="timeZone" label="Time zone" value="UTC" />
            <Field name="maxAttempts" label="Maximum attempts" value="3" type="number" />
            <Field name="retryDelaySeconds" label="Retry delay seconds" value="300" type="number" />
            <Field name="timeoutSeconds" label="Timeout seconds" value="300" type="number" />
            <Field name="concurrencyKey" label="Concurrency key" />
            <Field name="description" label="Description" />
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
              <input type="checkbox" name="tenantScoped" />
              <span className="text-sm font-bold">Tenant scoped</span>
            </label>
            <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">
              Register job
            </button>
          </form>
        </section>
      ) : null}

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Job definitions</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.definitions.map((job) => (
            <article key={job.id} className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-black text-blue-700">{job.status}</p>
              <h3 className="mt-2 font-black">{job.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{job.key}</p>
              <p className="mt-3 text-sm text-slate-600">
                Handler: {job.handlerKey}
              </p>

              <form action={queuePlatformJobAction} className="mt-4">
                <input type="hidden" name="jobKey" value={job.key} />
                <input type="hidden" name="tenantId" value={data.tenantId} />
                <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
                  Queue now
                </button>
              </form>

              {data.isPlatformOperator ? (
                <form action={changePlatformJobStatusAction} className="mt-3 flex gap-2">
                  <input type="hidden" name="jobDefinitionId" value={job.id} />
                  <select className={input} name="status" defaultValue={job.status}>
                    <option>ACTIVE</option>
                    <option>PAUSED</option>
                    <option>DISABLED</option>
                  </select>
                  <button className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-black text-white">
                    Save
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Recent executions</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Trigger</th>
                <th className="px-4 py-3">Attempts</th>
                <th className="px-4 py-3">Queued</th>
                <th className="px-4 py-3">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.executions.map((execution) => (
                <tr key={execution.id}>
                  <td className="px-4 py-3 font-bold">
                    {execution.jobDefinition.name}
                  </td>
                  <td className="px-4 py-3">{execution.status}</td>
                  <td className="px-4 py-3">{execution.triggerType}</td>
                  <td className="px-4 py-3">{execution.attemptCount}</td>
                  <td className="px-4 py-3">
                    {execution.queuedAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-red-700">
                    {execution.errorMessage ?? "—"}
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
