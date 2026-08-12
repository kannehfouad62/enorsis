import Link from "next/link";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldCheck,
} from "lucide-react";

import {
  getActivityLog,
} from "@/modules/activity-log/queries";

const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950";

function jsonText(value: unknown) {
  if (value == null) return null;

  try {
    return JSON.stringify(
      value,
      null,
      2,
    );
  } catch {
    return String(value);
  }
}

function queryHref(
  params: Record<string, string | undefined>,
  page: number,
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  search.set("page", String(page));
  return `/app/activity-log?${search.toString()}`;
}

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    action?: string;
    resourceType?: string;
    tenantId?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const data = await getActivityLog(params);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
            Governance & Auditability
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-700" />
            <h1 className="text-4xl font-black tracking-tight">
              Activity Log
            </h1>
          </div>
          <p className="mt-3 max-w-4xl leading-7 text-slate-600">
            Search governed activity evidence by product, purchase request,
            action, user, resource, tenant, date or time.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 font-black text-blue-800">
            <ShieldCheck className="h-4 w-4" />
            {data.isPlatformSuperAdmin
              ? "Platform-wide audit scope"
              : "Tenant-only audit scope"}
          </div>
        </div>
      </div>

      <form className="mt-8 grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-3">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            className={`${input} w-full pl-9`}
            name="q"
            defaultValue={params.q}
            placeholder="Search product, SKU, user, request, resource or audit details..."
          />
        </div>

        {data.isPlatformSuperAdmin ? (
          <select
            className={input}
            name="tenantId"
            defaultValue={params.tenantId ?? ""}
          >
            <option value="">All tenants</option>
            {data.tenants.map((tenant) => (
              <option
                key={tenant.id}
                value={tenant.id}
              >
                {tenant.name} · {tenant.commercialPersona}
              </option>
            ))}
          </select>
        ) : null}

        <input
          className={input}
          name="action"
          defaultValue={params.action}
          placeholder="Action, e.g. purchase_request"
        />

        <input
          className={input}
          name="resourceType"
          defaultValue={params.resourceType}
          placeholder="Resource type"
        />

        <label className="text-xs font-black uppercase tracking-wide text-slate-500">
          From date/time
          <input
            className={`${input} mt-1 w-full`}
            type="datetime-local"
            name="from"
            defaultValue={params.from}
          />
        </label>

        <label className="text-xs font-black uppercase tracking-wide text-slate-500">
          To date/time
          <input
            className={`${input} mt-1 w-full`}
            type="datetime-local"
            name="to"
            defaultValue={params.to}
          />
        </label>

        <button className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white lg:col-span-3">
          Search activity
        </button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-600">
          {data.total.toLocaleString()} audit event
          {data.total === 1 ? "" : "s"} found
        </p>
        <p className="text-xs text-slate-500">
          Page {data.page} of {data.totalPages}
        </p>
      </div>

      <div className="mt-4 space-y-4">
        {data.events.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="font-black">No activity matched the current search.</p>
          </div>
        ) : null}

        {data.events.map((event) => {
          const before = jsonText(event.before);
          const after = jsonText(event.after);
          const metadata = jsonText(event.metadata);

          return (
            <article
              key={event.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                    {event.action}
                  </p>
                  <h2 className="mt-2 text-lg font-black">
                    {event.resourceType}
                    {event.resourceId
                      ? ` · ${event.resourceId}`
                      : ""}
                  </h2>
                </div>

                <div className="text-right">
                  <p className="text-sm font-black">
                    {event.outcome}
                  </p>
                  <time className="mt-1 block text-xs text-slate-500">
                    {event.occurredAt.toISOString()}
                  </time>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase text-slate-500">
                    User / actor
                  </p>
                  <p className="mt-1 text-sm font-black">
                    {event.actor?.name ??
                      event.actorLabel ??
                      event.actorId ??
                      event.actorType}
                  </p>
                  {event.actor?.email ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {event.actor.email}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase text-slate-500">
                    Tenant
                  </p>
                  <p className="mt-1 text-sm font-black">
                    {event.tenant?.name ??
                      event.tenantId ??
                      "Platform"}
                  </p>
                  {event.tenant?.commercialPersona ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {event.tenant.commercialPersona}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase text-slate-500">
                    Request / reason
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-700">
                    {event.requestId ??
                      event.reason ??
                      "No request reference"}
                  </p>
                </div>
              </div>

              {data.isPlatformSuperAdmin ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
                    <p className="text-[10px] font-black uppercase text-amber-800">
                      Advanced · IP address
                    </p>
                    <p className="mt-1 break-all text-xs font-bold text-slate-700">
                      {"ipAddress" in event
                        ? event.ipAddress ??
                          "Not captured"
                        : "Not captured"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3">
                    <p className="text-[10px] font-black uppercase text-amber-800">
                      Advanced · User agent / device
                    </p>
                    <p className="mt-1 break-all text-xs text-slate-700">
                      {"userAgent" in event
                        ? event.userAgent ??
                          "Not captured"
                        : "Not captured"}
                    </p>
                  </div>
                </div>
              ) : null}

              {before || after || metadata ? (
                <details className="mt-4 rounded-2xl border border-slate-200">
                  <summary className="px-4 py-3 text-sm font-black text-blue-700">
                    View audit details
                  </summary>
                  <div className="grid gap-3 border-t border-slate-200 p-4 lg:grid-cols-3">
                    {before ? (
                      <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-white">
                        {before}
                      </pre>
                    ) : null}
                    {after ? (
                      <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-white">
                        {after}
                      </pre>
                    ) : null}
                    {metadata ? (
                      <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-white">
                        {metadata}
                      </pre>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        {data.page > 1 ? (
          <Link
            href={queryHref(params, data.page - 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>
        ) : (
          <span />
        )}

        {data.page < data.totalPages ? (
          <Link
            href={queryHref(params, data.page + 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
