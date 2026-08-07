from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/executive/inventory-intelligence"' in content:
    print("Inventory Intelligence is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Inventory Intelligence",
    description: "Turnover, DIO, aging, ABC/XYZ and inventory health.",
    href: "/app/executive/inventory-intelligence",
    icon: BadgeCheck,
    group: "Intelligence",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Inventory Intelligence to the Enterprise Modules directory.")
