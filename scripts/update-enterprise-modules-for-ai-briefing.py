from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/executive/ai-briefing"' in content:
    print("Executive AI Decision Briefing is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Executive AI Briefing",
    description: "Prioritized decisions, risks, opportunities and executive actions.",
    href: "/app/executive/ai-briefing",
    icon: BadgeCheck,
    group: "Intelligence",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Executive AI Decision Briefing to the Enterprise Modules directory.")
