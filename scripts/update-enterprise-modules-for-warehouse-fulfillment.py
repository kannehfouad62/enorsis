from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/warehouse-fulfillment"' in content:
    print("Warehouse Fulfillment is already present.")
    raise SystemExit(0)

entry = """  {
    title: "Warehouse Fulfillment",
    description: "Picking, packing, issue and internal fulfillment.",
    href: "/app/warehouse-fulfillment",
    icon: BadgeCheck,
    group: "Procurement",
  },
"""

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Warehouse Fulfillment to the Enterprise Modules directory.")
