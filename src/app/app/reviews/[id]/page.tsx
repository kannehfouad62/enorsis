import Link from "next/link";
import { addProcurementReviewActionItem, addProcurementReviewMetricAction, changeProcurementReviewStatusAction } from "@/modules/procurement-reviews/actions";
import { getProcurementReview } from "@/modules/procurement-reviews/queries";

const input = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ProcurementReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { review, members } = await getProcurementReview(id);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link href="/app/reviews" className="font-black text-blue-700">← Executive reviews</Link>
      <h1 className="mt-5 text-4xl font-black">{review.title}</h1>
      <p className="mt-2 text-slate-600">{review.status} · {review.meetingAt.toLocaleString()}</p>
      <section className={`${card} mt-8`}><div className="grid gap-5 md:grid-cols-2"><Narrative title="Executive summary" value={review.executiveSummary} /><Narrative title="Accomplishments" value={review.accomplishments} /><Narrative title="Decisions required" value={review.decisionsRequired} /><Narrative title="Key risks" value={review.keyRisks} /><Narrative title="Next-period priorities" value={review.nextPeriodPriorities} /></div><form action={changeProcurementReviewStatusAction} className="mt-6 flex gap-3"><input type="hidden" name="reviewId" value={review.id} />{review.status === "DRAFT" ? <button name="status" value="IN_REVIEW" className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">Submit</button> : null}{review.status === "IN_REVIEW" ? <button name="status" value="APPROVED" className="rounded-xl bg-emerald-700 px-5 py-3 font-black text-white">Approve</button> : null}{review.status === "APPROVED" ? <button name="status" value="PUBLISHED" className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Publish</button> : null}</form></section>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={card}><h2 className="text-xl font-black">Add KPI snapshot</h2><form action={addProcurementReviewMetricAction} className="mt-5 grid gap-3"><input type="hidden" name="procurementReviewId" value={review.id} /><input className={input} name="key" placeholder="Unique key" required /><input className={input} name="name" placeholder="Metric name" required /><input className={input} name="category" placeholder="Category" required /><input className={input} name="value" type="number" step="0.0001" placeholder="Value" /><input className={input} name="target" type="number" step="0.0001" placeholder="Target" /><input className={input} name="unit" placeholder="Unit" /><select className={input} name="status"><option>ON_TRACK</option><option>AT_RISK</option><option>OFF_TRACK</option><option>NOT_AVAILABLE</option></select><textarea className={`${input} min-h-20`} name="commentary" placeholder="Commentary" /><button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white">Add metric</button></form></section>
        <section className={card}><h2 className="text-xl font-black">Add action</h2><form action={addProcurementReviewActionItem} className="mt-5 grid gap-3"><input type="hidden" name="procurementReviewId" value={review.id} /><input className={input} name="title" placeholder="Action title" required /><textarea className={`${input} min-h-24`} name="description" placeholder="Description" /><select className={input} name="ownerUserId" required><option value="">Select owner</option>{members.map((m) => <option key={m.id} value={m.userId}>{m.user.name ?? m.user.email}</option>)}</select><input className={input} name="dueAt" type="date" required /><button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Add action</button></form></section>
      </div>
      <section className={`${card} mt-6`}><h2 className="text-xl font-black">KPI scorecard</h2><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{review.metrics.map((metric) => <article key={metric.id} className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-black text-blue-700">{metric.category} · {metric.status}</p><h3 className="mt-2 font-black">{metric.name}</h3><p className="mt-3 text-3xl font-black">{metric.value?.toString() ?? "—"} {metric.unit ?? ""}</p><p className="mt-2 text-sm text-slate-500">Target {metric.target?.toString() ?? "—"}</p></article>)}</div></section>
      <section className={`${card} mt-6`}><h2 className="text-xl font-black">Review actions</h2><div className="mt-5 space-y-3">{review.actions.map((action) => <article key={action.id} className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-black text-blue-700">{action.status} · Due {action.dueAt.toLocaleDateString()}</p><h3 className="mt-2 font-black">{action.title}</h3><p className="mt-2 text-sm text-slate-600">{action.description ?? "No description."}</p></article>)}</div></section>
    </div>
  );
}

function Narrative({ title, value }: { title: string; value: string | null }) {
  return <div><h3 className="font-black">{title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{value ?? "Not recorded."}</p></div>;
}
