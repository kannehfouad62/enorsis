from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/executive/board-distribution"' in content:
    print("Board Distribution is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Board Distribution",
    description: "Secure board recipients, committee groups and delivery audit.",
    href: "/app/executive/board-distribution",
    icon: BadgeCheck,
    group: "Intelligence",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Board Distribution to the Enterprise Modules directory.")
