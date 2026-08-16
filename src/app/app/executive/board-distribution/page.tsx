import { sendExecutiveBoardDistributionAction } from "@/modules/executive-board-reporting/email-actions";
import {
  addExecutiveBoardRecipientAction,
  createExecutiveBoardDistributionAction,
  createExecutiveBoardRecipientGroupAction,
  markExecutiveBoardDistributionSentAction,
  revokeExecutiveBoardDeliveryAction,
} from "@/modules/executive-board-reporting/distribution-actions";
import { getExecutiveBoardDistributionWorkspace } from "@/modules/executive-board-reporting/distribution-queries";

const card =
  "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default async function ExecutiveBoardDistributionPage() {
  const data = await getExecutiveBoardDistributionWorkspace();

  const recipients = data.groups.reduce(
    (sum, group) => sum + group.members.length,
    0,
  );
  const sent = data.distributions.filter(
    (distribution) => distribution.status === "SENT",
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div>
        <h1 className="mt-3 text-4xl font-black">
          Secure Board Distribution
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Board and committee recipient groups, finalized-pack distribution,
          recipient-level delivery control and auditable access history.
        </p>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Recipient groups", data.groups.length],
          ["Active recipients", recipients],
          ["Finalized packs", data.packs.length],
          ["Sent distributions", sent],
        ].map(([label, value]) => (
          <article key={String(label)} className={card}>
            <p className="text-xs font-black uppercase text-slate-500">
              {label}
            </p>
            <p className="mt-3 text-4xl font-black">{value}</p>
          </article>
        ))}
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-black">Create recipient group</h2>
          <form
            action={createExecutiveBoardRecipientGroupAction}
            className="mt-5 space-y-3"
          >
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              name="name"
              placeholder="Group name"
              required
            />
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              name="groupType"
              defaultValue="BOARD"
            >
              <option value="BOARD">Board</option>
              <option value="AUDIT_COMMITTEE">Audit Committee</option>
              <option value="RISK_COMMITTEE">Risk Committee</option>
              <option value="PROCUREMENT_COMMITTEE">Procurement Committee</option>
              <option value="FINANCE_COMMITTEE">Finance Committee</option>
              <option value="EXECUTIVE_LEADERSHIP">Executive Leadership</option>
              <option value="CUSTOM">Custom</option>
            </select>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              name="description"
              placeholder="Description"
            />
            <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
              Create group
            </button>
          </form>
        </section>

        <section className={card}>
          <h2 className="text-xl font-black">Add recipient</h2>
          <form
            action={addExecutiveBoardRecipientAction}
            className="mt-5 space-y-3"
          >
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              name="groupId"
              required
            >
              <option value="">Select recipient group</option>
              {data.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              name="name"
              placeholder="Recipient name"
              required
            />
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              name="email"
              type="email"
              placeholder="Email"
              required
            />
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              name="title"
              placeholder="Title"
            />
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              name="organization"
              placeholder="Organization"
            />
            <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
              Add recipient
            </button>
          </form>
        </section>
      </div>

      <section className={`${card} mt-8`}>
        <h2 className="text-xl font-black">Create distribution</h2>
        <form
          action={createExecutiveBoardDistributionAction}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            name="boardPackId"
            required
          >
            <option value="">Select finalized pack</option>
            {data.packs.map((pack) => (
              <option key={pack.id} value={pack.id}>
                {pack.title}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            name="recipientGroupId"
            required
          >
            <option value="">Select recipient group</option>
            {data.groups
              .filter((group) => group.active)
              .map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
          </select>

          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            name="subject"
            placeholder="Email subject (optional)"
          />

          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            name="message"
            placeholder="Distribution message"
          />

          <button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white">
            Create distribution
          </button>
        </form>
      </section>

      <section className="mt-8 space-y-5">
        {data.distributions.map((distribution) => (
          <article key={distribution.id} className={card}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-blue-700">
                  {distribution.status}
                </p>
                <h2 className="mt-2 text-xl font-black">
                  {distribution.boardPack.title}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {distribution.distributionNumber} ·{" "}
                  {distribution.recipientGroup.name}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm">
                <p>
                  Recipients:{" "}
                  <span className="font-black">
                    {distribution.deliveries.length}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Created {distribution.createdAt.toLocaleString()}
                </p>
              </div>
            </div>

            {distribution.status === "PENDING" ||
            distribution.status === "FAILED" ||
            distribution.status === "PARTIALLY_SENT" ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <form
                  action={sendExecutiveBoardDistributionAction}
                  className="flex flex-wrap gap-3"
                >
                  <input
                    type="hidden"
                    name="distributionId"
                    value={distribution.id}
                  />
                  <input
                    className="w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    name="accessHours"
                    type="number"
                    min="1"
                    max="720"
                    defaultValue="168"
                    title="Secure link lifetime in hours"
                  />
                  <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white">
                    Send secure emails
                  </button>
                </form>

                <form action={markExecutiveBoardDistributionSentAction}>
                  <input
                    type="hidden"
                    name="distributionId"
                    value={distribution.id}
                  />
                  <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black">
                    Mark sent manually
                  </button>
                </form>
              </div>
            ) : null}

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Recipient</th>
                    <th className="px-3 py-3">Email</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Sent</th>
                    <th className="px-3 py-3">Opened</th>
                    <th className="px-3 py-3">Access events</th>
                    <th className="px-3 py-3">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {distribution.deliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td className="px-3 py-3 font-black">
                        {delivery.recipient.name}
                      </td>
                      <td className="px-3 py-3">
                        {delivery.recipient.email}
                      </td>
                      <td className="px-3 py-3">{delivery.status}</td>
                      <td className="px-3 py-3">
                        {delivery.sentAt?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        {delivery.openedAt?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        {delivery.accessEvents.length}
                      </td>
                      <td className="px-3 py-3">
                        {delivery.status !== "REVOKED" ? (
                          <form action={revokeExecutiveBoardDeliveryAction}>
                            <input
                              type="hidden"
                              name="deliveryId"
                              value={delivery.id}
                            />
                            <button className="rounded-lg border border-red-200 px-3 py-1 text-xs font-black text-red-700">
                              Revoke
                            </button>
                          </form>
                        ) : (
                          "Revoked"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
