from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/executive/ai-governance"' in content:
    print("Executive AI Governance is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Executive AI Governance",
    description: "Human review, approvals, escalation and AI decision audit.",
    href: "/app/executive/ai-governance",
    icon: BadgeCheck,
    group: "Intelligence",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Executive AI Governance to the Enterprise Modules directory.")
