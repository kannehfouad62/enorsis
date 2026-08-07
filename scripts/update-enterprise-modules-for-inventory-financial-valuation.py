from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/inventory-financial-valuation"' in content:
    print("Inventory Financial Valuation is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Inventory Financial Valuation",
    description: "Cost layers, inventory valuation and financial reconciliation.",
    href: "/app/inventory-financial-valuation",
    icon: BadgeCheck,
    group: "Procurement",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Inventory Financial Valuation to the Enterprise Modules directory.")
