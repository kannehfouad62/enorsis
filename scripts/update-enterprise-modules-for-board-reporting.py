from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/executive/board-reporting"' in content:
    print("Executive Board Reporting is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Executive Board Reporting",
    description: "Governed CEO, CFO, COO, CPO and board-pack generation.",
    href: "/app/executive/board-reporting",
    icon: BadgeCheck,
    group: "Intelligence",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Executive Board Reporting to the Enterprise Modules directory.")
