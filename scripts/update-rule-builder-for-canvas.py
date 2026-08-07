from pathlib import Path

path = Path("src/app/app/automation/designer/page.tsx")
content = path.read_text()

if '"/app/automation/canvas"' in content:
    print("Visual Rule Builder already links Workflow Canvas.")
    raise SystemExit(0)

anchor = """        <Link
          href="/app/automation"
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
        >
          Automation Dashboard
        </Link>"""

replacement = """        <div className="flex gap-3">
          <Link
            href={
              data.selected
                ? `/app/automation/canvas?ruleId=${data.selected.id}`
                : "/app/automation/canvas"
            }
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white"
          >
            Visual Canvas
          </Link>
          <Link
            href="/app/automation"
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
          >
            Automation Dashboard
          </Link>
        </div>"""

if anchor not in content:
    raise SystemExit("Could not locate Rule Builder navigation anchor.")

path.write_text(content.replace(anchor, replacement, 1))
print("Added Visual Canvas link to Visual Rule Builder.")
