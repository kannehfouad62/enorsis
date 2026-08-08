from pathlib import Path

path = Path(
    "src/app/app/automation/connectors/page.tsx"
)
content = path.read_text()

if '"/app/automation/connectors/observability"' in content:
    print("Connector Registry already links Observability.")
    raise SystemExit(0)

anchor = '''        <Link
          href="/app/automation/runtime"
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
        >
          Durable Runtime
        </Link>'''

replacement = anchor + '''
        <Link
          href="/app/automation/connectors/observability"
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black"
        >
          Observability
        </Link>'''

if anchor not in content:
    raise SystemExit("Could not locate Durable Runtime link.")

path.write_text(
    content.replace(anchor, replacement, 1)
)
print("Added Connector Observability link.")
