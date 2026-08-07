from pathlib import Path

path = Path("src/app/app/executive/board-reporting/page.tsx")
content = path.read_text()

if '"/app/executive/board-calendar"' in content:
    print("Board Reporting already links Board Calendar.")
    raise SystemExit(0)

heading = """      <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">"""

replacement = """      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
        <p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">"""

if heading not in content:
    raise SystemExit("Could not locate board reporting heading anchor.")

content = content.replace(heading, replacement, 1)

closing = """        </p>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">"""

closing_replacement = """        </p>
        </div>
        <a
          href="/app/executive/board-calendar"
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
        >
          Board Calendar
        </a>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">"""

if closing not in content:
    raise SystemExit("Could not locate board reporting heading close anchor.")

path.write_text(content.replace(closing, closing_replacement, 1))
print("Added Board Calendar link to Executive Board Reporting.")
