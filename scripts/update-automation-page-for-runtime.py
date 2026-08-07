from pathlib import Path

path = Path("src/app/app/automation/page.tsx")
content = path.read_text()

if '"/app/automation/runtime"' in content:
    print("Automation dashboard already links Durable Runtime.")
    raise SystemExit(0)

anchor = """        <a
          href="/app/automation/designer"
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
        >
          Visual Rule Builder
        </a>"""

replacement = anchor + """
        <a
          href="/app/automation/runtime"
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
        >
          Durable Runtime
        </a>"""

if anchor not in content:
    raise SystemExit("Could not locate Visual Rule Builder link.")

path.write_text(content.replace(anchor, replacement, 1))
print("Added Durable Runtime link to Automation dashboard.")
