from pathlib import Path

path = Path("src/app/app/executive/page.tsx")
content = path.read_text()

if '"/app/executive/ai-briefing"' in content:
    print("Executive workspace already links AI Briefing.")
    raise SystemExit(0)

anchor = '["/app/executive/kpis", "Enterprise KPI Engine"],'
replacement = (
    '["/app/executive/kpis", "Enterprise KPI Engine"],\n'
    '            ["/app/executive/ai-intelligence", "Governed Executive AI"],\n'
    '            ["/app/executive/ai-briefing", "Executive AI Briefing"],'
)

if anchor not in content:
    raise SystemExit("Could not locate executive drill-down anchor.")

path.write_text(content.replace(anchor, replacement, 1))
print("Added AI Intelligence and AI Briefing to executive drill-downs.")
