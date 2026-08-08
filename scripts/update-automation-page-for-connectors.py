from pathlib import Path

path = Path("src/app/app/automation/page.tsx")
content = path.read_text()

if '"/app/automation/connectors"' in content:
    print("Automation dashboard already links Connector Registry.")
    raise SystemExit(0)

anchor = '        <a\n          href="/app/automation/runtime"\n          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"\n        >\n          Durable Runtime\n        </a>'

replacement = anchor + '\n        <a\n          href="/app/automation/connectors"\n          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"\n        >\n          Connector Registry\n        </a>'

if anchor not in content:
    raise SystemExit("Could not locate Durable Runtime navigation anchor.")

path.write_text(content.replace(anchor, replacement, 1))
print("Added Connector Registry link to Automation dashboard.")
