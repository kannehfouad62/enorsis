import {
  BadgeCheck,
  CheckCircle2,
  Download,
  FileClock,
  FileWarning,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { reviewPlatformSupplierDocumentAction } from "@/modules/platform-supplier-verification/actions";
import { getPlatformSupplierVerificationQueue } from "@/modules/platform-supplier-verification/queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const input =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

export default async function PlatformSupplierVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ reviewed?: string }>;
}) {
  const params = await searchParams;
  const data = await getPlatformSupplierVerificationQueue();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 xl:px-10">
      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">
          Enorsis Platform Administration
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">
          Supplier Verification Queue
        </h1>
        <p className="mt-3 max-w-4xl leading-7 text-slate-600">
          Independently review qualification evidence uploaded by
          supplier tenants to their governed Enorsis supplier profiles.
          Verification here is platform-level and does not replace a
          buyer&apos;s own qualification decision.
        </p>
      </div>

      {params.reviewed ? (
        <div
          role="status"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-black">
              Supplier document review completed
            </p>
            <p className="mt-1 text-sm">
              The verification decision has been recorded and is now
              visible to the supplier tenant.
            </p>
          </div>
        </div>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          icon={FileClock}
          label="Pending review"
          value={data.metrics.pending}
        />
        <Metric
          icon={BadgeCheck}
          label="Verified"
          value={data.metrics.verified}
        />
        <Metric
          icon={XCircle}
          label="Rejected"
          value={data.metrics.rejected}
        />
        <Metric
          icon={FileWarning}
          label="Expired"
          value={data.metrics.expired}
        />
        <Metric
          icon={ShieldCheck}
          label="All evidence"
          value={data.metrics.total}
        />
      </section>

      <section className={`${card} mt-8`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Pending verification</h2>
            <p className="mt-1 text-sm text-slate-500">
              Supplier-self-service uploads awaiting an Enorsis platform decision.
            </p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
            {data.pending.length} pending
          </span>
        </div>

        <div className="mt-6 space-y-5">
          {data.pending.length > 0 ? (
            data.pending.map((document) => (
              <VerificationCard
                key={document.id}
                document={document}
                reviewable
              />
            ))
          ) : (
            <EmptyState text="There are no supplier documents waiting for platform verification." />
          )}
        </div>
      </section>

      <section className={`${card} mt-8`}>
        <h2 className="text-2xl font-black">Verification history</h2>
        <p className="mt-1 text-sm text-slate-500">
          Previously reviewed or expired supplier evidence.
        </p>

        <div className="mt-6 space-y-4">
          {data.documents
            .filter(
              (document) =>
                document.status !== "PENDING_VERIFICATION",
            )
            .map((document) => (
              <VerificationCard
                key={document.id}
                document={document}
                reviewable={false}
              />
            ))}
        </div>
      </section>
    </div>
  );
}

function VerificationCard({
  document,
  reviewable,
}: {
  document: Awaited<
    ReturnType<typeof getPlatformSupplierVerificationQueue>
  >["documents"][number];
  reviewable: boolean;
}) {
  const supplierName =
    document.supplier.tradingName ??
    document.supplier.legalName;

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.15em] text-blue-700">
            {document.supplier.tenant.name} ·{" "}
            {document.supplier.supplierNumber}
          </p>
          <h3 className="mt-2 text-lg font-black">{supplierName}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {formatStatus(document.type)} · {document.name}
          </p>
        </div>
        <StatusBadge status={document.status} />
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <Detail
          label="Country"
          value={document.supplier.countryCode}
        />
        <Detail
          label="Tax ID"
          value={
            document.supplier.taxIdentificationNo ??
            "Not provided"
          }
        />
        <Detail
          label="Issued"
          value={
            document.issuedAt?.toLocaleDateString() ??
            "Not specified"
          }
        />
        <Detail
          label="Expires"
          value={
            document.expiresAt?.toLocaleDateString() ??
            "No expiry"
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={`/api/platform/supplier-verification/documents/${document.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-blue-700"
        >
          <Download className="h-4 w-4" />
          Download evidence
        </a>

        <span className="text-xs font-semibold text-slate-500">
          Uploaded {document.createdAt.toLocaleString()}
        </span>

        {document.verifiedAt ? (
          <span className="text-xs font-semibold text-emerald-700">
            Verified {document.verifiedAt.toLocaleString()}
          </span>
        ) : null}
      </div>

      {document.rejectionReason ? (
        <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          Rejection reason: {document.rejectionReason}
        </div>
      ) : null}

      {reviewable ? (
        <form
          action={reviewPlatformSupplierDocumentAction}
          className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4"
        >
          <input
            type="hidden"
            name="documentId"
            value={document.id}
          />

          <label>
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
              Reviewer notes / rejection reason
            </span>
            <textarea
              className={`${input} mt-2 min-h-24`}
              name="reviewerNotes"
              placeholder="Optional for verification; required when rejecting."
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              name="decision"
              value="VERIFIED"
              className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white"
            >
              Verify document
            </button>
            <button
              name="decision"
              value="REJECTED"
              className="rounded-xl bg-rose-700 px-5 py-3 text-sm font-black text-white"
            >
              Reject document
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: number;
}) {
  return (
    <article className={card}>
      <Icon className="h-5 w-5 text-blue-700" />
      <p className="mt-4 text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black">
        {value.toLocaleString()}
      </p>
    </article>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-700">
      {formatStatus(status)}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
      {text}
    </div>
  );
}

function formatStatus(value: string) {
  return value
    .split("_")
    .map(
      (part) =>
        part.charAt(0) + part.slice(1).toLowerCase(),
    )
    .join(" ");
}
