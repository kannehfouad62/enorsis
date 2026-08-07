from pathlib import Path

path = Path("src/app/app/executive/page.tsx")
content = path.read_text()

if '"/app/executive/board-reporting"' in content:
    print("Executive workspace already links Board Reporting.")
    raise SystemExit(0)

anchor = '["/app/executive/ai-briefing", "Executive AI Briefing"],'
replacement = (
    anchor
    + '\n            ["/app/executive/board-reporting", "Executive Board Reporting"],'
)

if anchor not in content:
    raise SystemExit("Could not locate executive AI Briefing drill-down anchor.")

path.write_text(content.replace(anchor, replacement, 1))
print("Added Executive Board Reporting to executive drill-downs.")
