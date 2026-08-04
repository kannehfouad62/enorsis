import Link from "next/link";
import {
  decideAccessReviewItemAction,
  remediateAccessReviewItemAction,
} from "@/modules/access-governance/actions";
import { getAccessReviewCampaign } from "@/modules/access-governance/queries";

const input =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5";

export default async function AccessReviewCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { campaign } = await getAccessReviewCampaign(id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Link
        href="/app/settings/access-governance"
        className="font-black text-blue-700"
      >
        ← Access governance
      </Link>
      <h1 className="mt-5 text-4xl font-black">{campaign.name}</h1>
      <p className="mt-2 text-slate-600">
        {campaign.status} · Due {campaign.dueAt.toLocaleString()}
      </p>

      <div className="mt-8 space-y-5">
        {campaign.items.map((item) => (
          <article
            key={item.id}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-xs font-black text-blue-700">{item.status}</p>
            <h2 className="mt-2 text-xl font-black">
              {item.userName ?? item.userEmail}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Current roles: {item.currentRoles.join(", ")}
            </p>

            {item.status === "PENDING" ? (
              <form action={decideAccessReviewItemAction} className="mt-5 grid gap-3">
                <input type="hidden" name="itemId" value={item.id} />
                <input
                  className={input}
                  name="requestedRoles"
                  defaultValue={item.currentRoles.join(", ")}
                  placeholder="Requested roles, comma separated"
                />
                <textarea
                  className={`${input} min-h-20`}
                  name="decisionComments"
                  placeholder="Decision rationale"
                />
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white" name="decision" value="CERTIFY">
                    Certify
                  </button>
                  <button className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white" name="decision" value="REVOKE">
                    Revoke access
                  </button>
                  <button className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white" name="decision" value="CHANGE_ROLE">
                    Change roles
                  </button>
                  <button className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white" name="decision" value="APPROVE_EXCEPTION">
                    Approve exception
                  </button>
                </div>
              </form>
            ) : null}

            {["REVOKE_REQUESTED", "ROLE_CHANGE_REQUESTED"].includes(item.status) ? (
              <form action={remediateAccessReviewItemAction} className="mt-5">
                <input type="hidden" name="itemId" value={item.id} />
                <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white">
                  Apply remediation
                </button>
              </form>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
