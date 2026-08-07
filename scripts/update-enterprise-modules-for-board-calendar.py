from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/executive/board-calendar"' in content:
    print("Board Calendar is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Board Calendar",
    description: "Schedule monthly, quarterly and annual governed board packs.",
    href: "/app/executive/board-calendar",
    icon: BadgeCheck,
    group: "Intelligence",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Board Calendar to the Enterprise Modules directory.")
