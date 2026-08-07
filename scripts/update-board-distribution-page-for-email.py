from pathlib import Path

path = Path("src/app/app/executive/board-distribution/page.tsx")
content = path.read_text()

import_line = (
    'import { sendExecutiveBoardDistributionAction } '
    'from "@/modules/executive-board-reporting/email-actions";\n'
)

if import_line not in content:
    content = import_line + content

old = """            {distribution.status === "PENDING" ? (
              <form
                action={markExecutiveBoardDistributionSentAction}
                className="mt-5"
              >
                <input
                  type="hidden"
                  name="distributionId"
                  value={distribution.id}
                />
                <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">
                  Mark distribution sent
                </button>
              </form>
            ) : null}"""

new = """            {distribution.status === "PENDING" ||
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
            ) : null}"""

if "Send secure emails" not in content:
    if old not in content:
        raise SystemExit("Could not locate board distribution send anchor.")
    content = content.replace(old, new, 1)

path.write_text(content)
print("Added secure Resend email delivery controls to Board Distribution.")
