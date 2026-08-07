from pathlib import Path

path = Path("src/app/app/executive/board-reporting/page.tsx")
content = path.read_text()

if '"/app/executive/board-distribution"' in content:
    print("Board Reporting already links Board Distribution.")
    raise SystemExit(0)

anchor = """        <a
          href="/app/executive/board-calendar"
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
        >
          Board Calendar
        </a>"""

replacement = anchor + """
        <a
          href="/app/executive/board-distribution"
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
        >
          Board Distribution
        </a>"""

if anchor not in content:
    raise SystemExit("Could not locate Board Calendar link anchor.")

path.write_text(content.replace(anchor, replacement, 1))
print("Added Board Distribution link to Executive Board Reporting.")
