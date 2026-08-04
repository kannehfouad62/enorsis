import Link from "next/link";
import { createProcurementReviewAction } from "@/modules/procurement-reviews/actions";
import { getProcurementReviewsWorkspace } from "@/modules/procurement-reviews/queries";

const input = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5";
const card = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ProcurementReviewsPage() {
  const { reviews, members } = await getProcurementReviewsWorkspace();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">Executive procurement governance</p>
      <h1 className="mt-3 text-4xl font-black">Executive Reviews</h1>
      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Create executive review</h2>
        <form action={createProcurementReviewAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input className={input} name="title" placeholder="Review title" required />
          <select className={input} name="type" defaultValue="MONTHLY_BUSINESS_REVIEW">
            <option>WEEKLY_OPERATING_REVIEW</option><option>MONTHLY_BUSINESS_REVIEW</option><option>QUARTERLY_BUSINESS_REVIEW</option><option>EXECUTIVE_COMMITTEE</option><option>BOARD_PACK</option>
          </select>
          <input className={input} name="periodStart" type="date" required />
          <input className={input} name="periodEnd" type="date" required />
          <input className={input} name="meetingAt" type="datetime-local" required />
          <select className={input} name="chairUserId"><option value="">No chair selected</option>{members.map((m) => <option key={m.id} value={m.userId}>{m.user.name ?? m.user.email}</option>)}</select>
          <textarea className={`${input} min-h-24 md:col-span-2`} name="executiveSummary" placeholder="Executive summary" />
          <textarea className={`${input} min-h-24`} name="accomplishments" placeholder="Accomplishments" />
          <textarea className={`${input} min-h-24`} name="decisionsRequired" placeholder="Decisions required" />
          <textarea className={`${input} min-h-24`} name="keyRisks" placeholder="Key risks" />
          <textarea className={`${input} min-h-24`} name="nextPeriodPriorities" placeholder="Next-period priorities" />
          <button className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Create review</button>
        </form>
      </section>
      <section className={`${card} mt-6`}>
        <h2 className="text-xl font-black">Review library</h2>
        <div className="mt-5 grid gap-5 xl:grid-cols-2">{reviews.map((review) => <article key={review.id} className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-black text-blue-700">{review.type.replaceAll("_", " ")} · {review.status}</p><h3 className="mt-2 text-lg font-black">{review.title}</h3><p className="mt-2 text-sm text-slate-500">{review.metrics.length} metrics · {review.actions.length} actions</p><Link href={`/app/reviews/${review.id}`} className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">Open review</Link></article>)}</div>
      </section>
    </div>
  );
}
