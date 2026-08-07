from pathlib import Path

path = Path("src/app/app/executive/ai-briefing/page.tsx")
content = path.read_text()

if '"/app/executive/ai-synthesis"' in content:
    print("AI Briefing already links OpenAI Executive Synthesis.")
    raise SystemExit(0)

anchor = """          <Link
            href="/app/executive/ai-governance"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
          >
            AI Governance
          </Link>"""

replacement = anchor + """
          <Link
            href="/app/executive/ai-synthesis"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black"
          >
            OpenAI Synthesis
          </Link>"""

if anchor not in content:
    raise SystemExit("Could not locate AI Governance link anchor.")

path.write_text(content.replace(anchor, replacement, 1))
print("Added OpenAI Executive Synthesis link to AI Briefing.")
