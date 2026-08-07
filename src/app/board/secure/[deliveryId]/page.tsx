import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { validateBoardDeliveryAccess } from "@/core/executive-board-reporting/secure-access";

export default async function SecureBoardPackPage({
  params,
  searchParams,
}: {
  params: Promise<{ deliveryId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { deliveryId } = await params;
  const { token } = await searchParams;

  if (!token) notFound();

  const requestHeaders = await headers();

  let delivery;

  try {
    delivery = await validateBoardDeliveryAccess({
      deliveryId,
      token,
      ipAddress:
        requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        null,
      userAgent: requestHeaders.get("user-agent"),
      recordOpen: true,
    });
  } catch {
    notFound();
  }

  const pack = delivery.distribution.boardPack;
  const section =
    pack.sectionSnapshot &&
    typeof pack.sectionSnapshot === "object" &&
    !Array.isArray(pack.sectionSnapshot)
      ? (pack.sectionSnapshot as Record<string, unknown>)
      : {};

  const risks = Array.isArray(section.risks) ? section.risks : [];
  const opportunities = Array.isArray(section.opportunities)
    ? section.opportunities
    : [];

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[.2em] text-blue-700">
          Secure Enorsis Board Portal
        </p>
        <h1 className="mt-3 text-4xl font-black">{pack.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {pack.packNumber} · {pack.packType} ·{" "}
          {pack.periodStart.toLocaleDateString()} –{" "}
          {pack.periodEnd.toLocaleDateString()}
        </p>

        <div className="mt-7 rounded-2xl bg-slate-50 p-5">
          <p className="text-xs font-black uppercase text-slate-500">
            Executive Summary
          </p>
          <p className="mt-2 leading-7">
            {pack.executiveSummary ?? "No executive summary available."}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`/api/board/secure/${delivery.id}/pdf?token=${encodeURIComponent(token)}`}
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Download secure PDF
          </a>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="text-xl font-black">Top Risks</h2>
            <div className="mt-4 space-y-3">
              {risks.slice(0, 10).map((item, index) => (
                <pre
                  key={index}
                  className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm"
                >
                  {JSON.stringify(item, null, 2)}
                </pre>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black">Top Opportunities</h2>
            <div className="mt-4 space-y-3">
              {opportunities.slice(0, 10).map((item, index) => (
                <pre
                  key={index}
                  className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm"
                >
                  {JSON.stringify(item, null, 2)}
                </pre>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-5 text-xs text-slate-500">
          Recipient: {delivery.recipient.name} ·{" "}
          {delivery.recipient.email}
          <br />
          Access expires:{" "}
          {delivery.accessExpiresAt?.toLocaleString() ?? "No expiry recorded"}
          <br />
          Source fingerprint: {pack.sourceFingerprint}
        </div>
      </div>
    </main>
  );
}
