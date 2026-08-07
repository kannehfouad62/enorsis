from pathlib import Path

path = Path("src/app/app/executive/ai-briefing/page.tsx")
content = path.read_text()

if '"/app/executive/ai-governance"' in content:
    print("AI Briefing already links AI Governance.")
    raise SystemExit(0)

anchor = """          <Link
            href="/app/executive"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
          >
            Executive Workspace
          </Link>"""

replacement = anchor + """
          <Link
            href="/app/executive/ai-governance"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
          >
            AI Governance
          </Link>"""

if anchor not in content:
    raise SystemExit("Could not locate AI Briefing navigation anchor.")

path.write_text(content.replace(anchor, replacement, 1))
print("Added AI Governance link to Executive AI Briefing.")
