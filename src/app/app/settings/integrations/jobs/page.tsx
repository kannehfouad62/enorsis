import { retryIntegrationJobAction } from "@/modules/integrations/actions";
import { getIntegrationJobsWorkspace } from "@/modules/integrations/queries";

export default async function IntegrationJobsPage() {
  const { jobs } = await getIntegrationJobsWorkspace();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
        Integration operations
      </p>
      <h1 className="mt-3 text-4xl font-black">Delivery jobs</h1>

      <section className="mt-8 overflow-x-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Connection</th>
              <th className="p-3">Resource</th>
              <th className="p-3">Direction</th>
              <th className="p-3">Status</th>
              <th className="p-3">Attempts</th>
              <th className="p-3">Created</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-t border-slate-100">
                <td className="p-3 font-black">{job.integration.name}</td>
                <td className="p-3">
                  {job.resourceType ?? "—"} · {job.resourceId ?? "—"}
                </td>
                <td className="p-3">{job.direction}</td>
                <td className="p-3">{job.status}</td>
                <td className="p-3">{job.attemptCount}</td>
                <td className="p-3">{job.createdAt.toLocaleString()}</td>
                <td className="p-3">
                  {["FAILED", "DEAD_LETTER"].includes(job.status) ? (
                    <form action={retryIntegrationJobAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">
                        Retry
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
