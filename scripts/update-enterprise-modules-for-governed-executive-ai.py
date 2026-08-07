from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/executive/ai-intelligence"' in content:
    print("Governed Executive AI Intelligence is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Governed Executive AI",
    description: "Explainable executive insights, evidence and confidence scoring.",
    href: "/app/executive/ai-intelligence",
    icon: BadgeCheck,
    group: "Intelligence",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Governed Executive AI Intelligence to the Enterprise Modules directory.")
