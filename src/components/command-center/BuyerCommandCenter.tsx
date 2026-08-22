"use client";

import {
  Bell,
  Bot,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  Globe2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type {
  BuyerCommandCenterData,
} from "@/modules/command-center/queries";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation:
      Math.abs(value) >= 1_000_000
        ? "compact"
        : "standard",
    maximumFractionDigits:
      Math.abs(value) >= 1_000_000 ? 1 : 0,
  }).format(value);
}

function integer(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function relativeTime(iso: string) {
  const value = new Date(iso).getTime();
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - value) / 1000),
  );

  if (seconds < 60) return "Just now";
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} min ago`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)} hr ago`;
  }

  return `${Math.floor(seconds / 86400)} day${
    Math.floor(seconds / 86400) === 1
      ? ""
      : "s"
  } ago`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function BuyerCommandCenter({
  initialData,
}: {
  initialData: BuyerCommandCenterData;
}) {
  const [data, setData] =
    useState(initialData);
  const [refreshing, setRefreshing] =
    useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);

    try {
      const response = await fetch(
        "/api/command-center",
        {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) return;

      const next =
        (await response.json()) as BuyerCommandCenterData;
      setData(next);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(
      () => void refresh(),
      30_000,
    );

    const handleFocus = () => {
      void refresh();
    };

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [refresh]);

  const metrics = [
    {
      label: "Requested demand",
      value: currency(
        data.summary.requestedDemandUsd,
      ),
      detail: `${integer(
        data.summary.requestCount,
      )} active request${
        data.summary.requestCount === 1
          ? ""
          : "s"
      }`,
      icon: CircleDollarSign,
    },
    {
      label: "Approved demand",
      value: currency(
        data.summary.approvedDemandUsd,
      ),
      detail: `${integer(
        data.summary.approvedRequestCount,
      )} approved request${
        data.summary.approvedRequestCount ===
        1
          ? ""
          : "s"
      }`,
      icon: FileCheck2,
    },
    {
      label: "Approved suppliers",
      value: integer(
        data.summary.approvedSuppliers,
      ),
      detail: "Current approved supplier records",
      icon: UsersRound,
    },
    {
      label: "Reconciliation exposure",
      value: currency(
        data.summary.reconciliationExposureUsd,
      ),
      detail: "Unresolved settlement variance",
      icon: ShieldAlert,
    },
  ];

  const attentionCount =
    data.summary.pendingApprovals;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 xl:px-10 xl:py-10">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-black uppercase tracking-[.24em] text-blue-700">
              Procurement mission control
            </p>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live data
            </span>
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl xl:text-5xl">
            {greeting()}, {data.user.name}.
          </h1>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            {attentionCount > 0
              ? `${attentionCount} purchase-request approval${
                  attentionCount === 1
                    ? ""
                    : "s"
                } currently require your decision.`
              : "No purchase-request approvals currently require your decision."}
            {" "}
            All financial values below are derived from current Enorsis records.
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Updated{" "}
            {new Date(
              data.generatedAt,
            ).toLocaleTimeString()}
            {" · "}
            refreshes every 30 seconds
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            aria-label="Refresh command center"
            title="Refresh command center"
          >
            <RefreshCw
              className={`h-5 w-5 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />
          </button>

          <Link
            href="/app/requests"
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold shadow-sm transition hover:bg-slate-50"
          >
            Review approvals
            {attentionCount > 0
              ? ` (${attentionCount})`
              : ""}
          </Link>

          <Link
            href="/app/requests#create-purchase-request"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-300 transition hover:bg-blue-700"
          >
            Create purchase request
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {metrics.map(
          ({
            label,
            value,
            detail,
            icon: Icon,
          }) => (
            <article
              key={label}
              className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,.05)]"
            >
              <div className="flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-5 text-sm font-semibold text-slate-500">
                {label}
              </p>
              <p className="mt-1 text-3xl font-black tracking-tight">
                {value}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {detail}
              </p>
            </article>
          ),
        )}
      </section>

      <section className="mt-6 grid gap-6 2xl:grid-cols-[1.45fr_.75fr]">
        <article className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl shadow-slate-300/70">
          <div className="border-b border-white/10 px-6 py-5 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">
                Live operations
              </p>
              <h2 className="mt-1 text-xl font-black">
                Operational portfolio
              </h2>
            </div>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300 sm:mt-0">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              Current tenant data
            </span>
          </div>

          <div className="relative min-h-[390px] overflow-hidden p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(37,99,235,.35),transparent_32%),linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[size:auto,34px_34px,34px_34px]" />

            <div className="relative grid gap-4 md:grid-cols-2">
              {data.operationalPanels.map(
                (panel) => (
                  <Link
                    key={panel.name}
                    href={panel.href}
                    className="rounded-2xl border border-white/10 bg-white/[.06] p-5 backdrop-blur-xl transition hover:border-cyan-300/30 hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <Globe2 className="h-5 w-5 text-cyan-300" />
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          panel.risk ===
                          "Normal"
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-amber-400/10 text-amber-300"
                        }`}
                      >
                        {panel.risk}
                      </span>
                    </div>

                    <h3 className="mt-5 font-bold">
                      {panel.name}
                    </h3>

                    <p className="mt-3 text-2xl font-black">
                      {panel.valueType ===
                      "currency"
                        ? currency(
                            panel.value,
                          )
                        : integer(
                            panel.value,
                          )}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      {panel.detail}
                    </p>
                  </Link>
                ),
              )}
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,.05)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">
                Live activity
              </p>
              <h2 className="mt-1 text-xl font-black">
                Your recent notifications
              </h2>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white">
              <Bell className="h-5 w-5" />
            </span>
          </div>

          <div className="mt-6 space-y-5">
            {data.activity.map(
              (activity) => (
                <Link
                  key={activity.id}
                  href={activity.href}
                  className="flex gap-4 border-b border-slate-100 pb-5 last:border-0 last:pb-0"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                    <Bot className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold leading-5">
                        {activity.title}
                      </span>
                      {activity.unread ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      {activity.detail}
                    </span>
                    <span className="mt-2 block text-[11px] font-semibold text-blue-700">
                      {relativeTime(
                        activity.createdAt,
                      )}
                    </span>
                  </span>
                </Link>
              ),
            )}

            {data.activity.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                No recent notifications.
              </p>
            ) : null}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <article className="rounded-3xl border border-slate-200/80 bg-white p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">
                Decision queue
              </p>
              <h2 className="mt-1 text-xl font-black">
                Your approvals required
              </h2>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              {data.approvals.length} pending
            </span>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-3 font-bold">
                    Request
                  </th>
                  <th className="pb-3 font-bold">
                    Requester
                  </th>
                  <th className="pb-3 font-bold">
                    Value
                  </th>
                  <th className="pb-3 font-bold">
                    Priority
                  </th>
                  <th className="pb-3 font-bold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.approvals.map(
                  (approval) => (
                    <tr
                      key={approval.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-4">
                        <p className="font-bold">
                          {approval.requestNumber}
                        </p>
                        <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                          {approval.title}
                        </p>
                      </td>
                      <td className="py-4 text-slate-600">
                        {approval.requester}
                      </td>
                      <td className="py-4 font-semibold">
                        {currency(
                          approval.valueUsd,
                        )}
                      </td>
                      <td className="py-4">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          {approval.priority}
                        </span>
                      </td>
                      <td className="py-4">
                        <Link
                          href={
                            approval.href
                          }
                          className="font-black text-blue-700"
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>

            {data.approvals.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                You have no pending purchase-request approvals.
              </p>
            ) : null}
          </div>
        </article>

        <article className="rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 p-6 text-white shadow-xl shadow-blue-200">
          <Sparkles className="h-7 w-7" />
          <p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-blue-100">
            Governed attention
          </p>

          {data.largestPendingRequest ? (
            <>
              <h2 className="mt-2 text-2xl font-black">
                {currency(
                  data.largestPendingRequest
                    .valueUsd,
                )} awaiting your approval
              </h2>
              <p className="mt-3 text-sm leading-6 text-blue-50">
                {
                  data.largestPendingRequest
                    .requestNumber
                }
                {" · "}
                {
                  data.largestPendingRequest
                    .title
                }
              </p>
              <Link
                href={
                  data.largestPendingRequest
                    .href
                }
                className="mt-8 block w-full rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-blue-700"
              >
                Review request
              </Link>
            </>
          ) : (
            <>
              <h2 className="mt-2 text-2xl font-black">
                Approval queue clear
              </h2>
              <p className="mt-3 text-sm leading-6 text-blue-50">
                No purchase-request decision is currently assigned to you.
              </p>
              <Link
                href="/app/requests"
                className="mt-8 block w-full rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-blue-700"
              >
                Open purchase requests
              </Link>
            </>
          )}
        </article>
      </section>
    </div>
  );
}
