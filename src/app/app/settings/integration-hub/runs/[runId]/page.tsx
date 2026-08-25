import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  retryConnectorSyncAction,
} from "@/modules/integration-hub/actions";

function record(
  value: unknown,
): Record<string, unknown> {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export default async function IntegrationRunDetailsPage({
  params,
}: {
  params: Promise<{
    runId: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const permitted = session.user.roles.some((role) =>
    [
      "TENANT_OWNER",
      "TENANT_ADMIN",
      "PLATFORM_SUPER_ADMIN",
      "PLATFORM_SUPPORT",
      "PLATFORM_AUDITOR",
    ].includes(role),
  );

  if (!permitted) {
    redirect("/app/unauthorized");
  }

  const { runId } = await params;

  const run =
    await prisma.enterpriseIntegrationSyncRun.findFirstOrThrow({
      where: {
        id: runId,
        connection: {
          tenantId: session.user.tenantId,
        },
      },
      include: {
        connection: {
          include: {
            connectorDefinition: true,
          },
        },
      },
    });

  const summary = record(run.summary);
  const diagnostics = Array.isArray(summary.diagnostics)
    ? summary.diagnostics.filter(
        (item): item is Record<string, unknown> =>
          Boolean(
            item &&
              typeof item === "object" &&
              !Array.isArray(item),
          ),
      )
    : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-700">
            Integration run
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            {run.connection.name}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {run.connection.connectorDefinition.provider}
            {" · "}
            {run.direction}
            {" · "}
            {run.triggerType}
          </p>
        </div>

        <Link
          href="/app/settings/integration-hub"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-800"
        >
          Back to Integration Hub
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Status", run.status],
          ["Read", String(run.recordsRead)],
          ["Written", String(run.recordsWritten)],
          ["Skipped", String(run.recordsSkipped)],
          ["Failed", String(run.recordsFailed)],
          [
            "Started",
            run.startedAt
              ? run.startedAt.toLocaleString()
              : "—",
          ],
          [
            "Completed",
            run.completedAt
              ? run.completedAt.toLocaleString()
              : "—",
          ],
          [
            "Correlation",
            run.correlationId ?? "—",
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              {label}
            </p>
            <p className="mt-2 break-all text-sm font-black text-slate-900">
              {value}
            </p>
          </div>
        ))}
      </section>

      {run.errorMessage ? (
        <section className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <h2 className="font-black text-rose-900">
            Failure
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-rose-800">
            {run.errorMessage}
          </p>
        </section>
      ) : null}

      {run.status === "FAILED" ||
      run.status === "PARTIALLY_SUCCEEDED" ? (
        <form
          action={retryConnectorSyncAction}
          className="mt-6"
        >
          <input
            type="hidden"
            name="runId"
            value={run.id}
          />
          <button className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Queue retry
          </button>
        </form>
      ) : null}

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">
          Run summary
        </h2>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
          {JSON.stringify(summary, null, 2)}
        </pre>
      </section>

      {diagnostics.length ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            Account diagnostics
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {diagnostics.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 font-bold">
                      {String(
                        item.accountName ??
                          item.externalId ??
                          "Unknown account",
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {String(item.status ?? "UNKNOWN")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {String(item.reason ?? "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
