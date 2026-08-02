import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  FileCheck2,
  Files,
} from "lucide-react";
import { getSupplierWorkspace } from "@/modules/suppliers/queries";

const cardClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function SupplierCompliancePage() {
  const { suppliers } = await getSupplierWorkspace();
  const now = new Date();
  const warningDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const documents = suppliers.flatMap((supplier) =>
    supplier.documents.map((document) => ({ supplier, document })),
  );
  const expired = documents.filter(
    ({ document }) => document.expiresAt && document.expiresAt <= now,
  );
  const expiringSoon = documents.filter(
    ({ document }) =>
      document.expiresAt &&
      document.expiresAt > now &&
      document.expiresAt <= warningDate,
  );
  const pending = documents.filter(
    ({ document }) => document.status === "PENDING_VERIFICATION",
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 xl:px-10 xl:py-12">
      <Link className="text-sm font-black text-blue-700" href="/app/suppliers">
        ← Supplier intelligence
      </Link>
      <h1 className="mt-5 text-4xl font-black tracking-tight">
        Supplier compliance
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Track verification, expiry exposure and evidence completeness across
        the supplier portfolio.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-4">
        <Metric icon={Files} label="Documents" value={String(documents.length)} />
        <Metric icon={FileCheck2} label="Pending verification" value={String(pending.length)} />
        <Metric icon={CalendarClock} label="Expiring in 30 days" value={String(expiringSoon.length)} />
        <Metric icon={AlertTriangle} label="Expired" value={String(expired.length)} />
      </div>

      <div className="mt-6 space-y-4">
        {[...expired, ...expiringSoon, ...pending].map(({ supplier, document }) => (
          <article key={document.id} className={cardClass}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">
                  {supplier.supplierNumber} · {document.type}
                </p>
                <h2 className="mt-2 text-lg font-black">{document.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {supplier.tradingName ?? supplier.legalName}
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                {document.status.replaceAll("_", " ")}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span>Expires: {document.expiresAt ? document.expiresAt.toLocaleDateString() : "No expiry"}</span>
              <Link className="font-black text-blue-700" href={`/app/suppliers/${supplier.id}`}>
                Review supplier
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Files;
  label: string;
  value: string;
}) {
  return (
    <article className={cardClass}>
      <Icon className="h-5 w-5 text-blue-700" />
      <p className="mt-4 text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </article>
  );
}
