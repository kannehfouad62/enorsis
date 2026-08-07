from pathlib import Path

path = Path("src/app/app/automation/page.tsx")
content = path.read_text()

if '"/app/automation/designer"' in content:
    print("Automation dashboard already links Visual Rule Builder.")
    raise SystemExit(0)

old = """      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">"""

new = """      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">"""

if old not in content:
    raise SystemExit("Could not locate automation page heading.")

content = content.replace(old, new, 1)

old_close = """        </p>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">"""

new_close = """        </p>
        </div>
        <a
          href="/app/automation/designer"
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
        >
          Visual Rule Builder
        </a>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">"""

if old_close not in content:
    raise SystemExit("Could not locate automation page heading close.")

path.write_text(content.replace(old_close, new_close, 1))
print("Added Visual Rule Builder link to Enterprise Workflow Automation.")
