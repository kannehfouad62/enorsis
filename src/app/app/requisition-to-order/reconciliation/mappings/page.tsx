import Link from "next/link";

import {
  createBankStatementMappingProfileAction,
  setBankStatementMappingProfileActiveAction,
} from "@/modules/bank-statement-mappings/actions";
import {
  getBankStatementMappingProfiles,
} from "@/modules/bank-statement-mappings/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function BankStatementMappingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    message?: string;
    error?: string;
  }>;
}) {
  const profiles =
    await getBankStatementMappingProfiles();
  const params = await searchParams;

  return (
    <main className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
            Accounts payable
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Bank Statement Mapping Profiles
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Save reusable CSV column mappings for banks, treasury
            systems, payment providers, and ERP exports.
          </p>
        </div>

        <Link
          href="/app/requisition-to-order/reconciliation"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700"
        >
          Back to reconciliation
        </Link>
      </header>

      {params.message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-900">
          {params.message}
        </div>
      ) : null}

      {params.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-900">
          {params.error}
        </div>
      ) : null}

      <section className={card}>
        <h2 className="text-xl font-black text-slate-950">
          Create mapping profile
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Enter the exact header names used by the source CSV.
          Header matching is case-insensitive and ignores punctuation.
        </p>

        <form
          action={createBankStatementMappingProfileAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {[
            ["Profile name", "name", "Chase Operating Account", true],
            ["Provider / bank", "providerName", "JPMorgan Chase", false],
            ["Reference column", "referenceColumn", "Transaction ID", true],
            ["Amount column", "amountColumn", "Debit Amount", true],
            ["Date column", "dateColumn", "Posting Date", false],
            ["Currency column", "currencyColumn", "Currency", false],
            ["Description column", "descriptionColumn", "Memo", false],
          ].map(([label, name, placeholder, required]) => (
            <label
              key={String(name)}
              className="text-xs font-bold text-slate-600"
            >
              {label}
              <input
                name={String(name)}
                required={Boolean(required)}
                placeholder={String(placeholder)}
                className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          ))}

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white"
            >
              Save mapping profile
            </button>
          </div>
        </form>
      </section>

      <section className={card}>
        <h2 className="text-xl font-black text-slate-950">
          Saved profiles
        </h2>

        <div className="mt-5 space-y-4">
          {profiles.map((profile) => (
            <article
              key={profile.id}
              className="rounded-2xl border border-slate-200 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-slate-950">
                      {profile.name}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                        profile.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {profile.active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {profile.providerName ?? "Custom source"}
                  </p>
                </div>

                <form
                  action={setBankStatementMappingProfileActiveAction}
                >
                  <input
                    type="hidden"
                    name="profileId"
                    value={profile.id}
                  />
                  <input
                    type="hidden"
                    name="active"
                    value={profile.active ? "false" : "true"}
                  />
                  <button
                    type="submit"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700"
                  >
                    {profile.active ? "Deactivate" : "Activate"}
                  </button>
                </form>
              </div>

              <div className="mt-4 grid gap-3 text-xs md:grid-cols-2 xl:grid-cols-5">
                {[
                  ["Reference", profile.referenceColumn],
                  ["Amount", profile.amountColumn],
                  ["Date", profile.dateColumn ?? "Automatic / none"],
                  ["Currency", profile.currencyColumn ?? "Automatic / none"],
                  ["Description", profile.descriptionColumn ?? "Automatic / none"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-slate-50 p-3"
                  >
                    <p className="font-black uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className="mt-1 font-bold text-slate-700">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}

          {profiles.length === 0 ? (
            <p className="text-sm text-slate-500">
              No mapping profiles have been created yet.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
