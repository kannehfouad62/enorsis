from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/logistics"' in content:
    print("Logistics & Freight is already present.")
    raise SystemExit(0)

if "Truck" not in content:
    anchor = "  Store,\n"
    if anchor not in content:
        raise SystemExit("Could not locate Store icon anchor.")
    content = content.replace(anchor, anchor + "  Truck,\n", 1)

module_anchor = '  {\n    title: "Demand Planning & Replenishment",\n'
entry = (
    '  {\n'
    '    title: "Logistics & Freight",\n'
    '    description: "Carriers, shipments, tracking, freight cost and delivery risk.",\n'
    '    href: "/app/logistics",\n'
    '    icon: Truck,\n'
    '    group: "Procurement",\n'
    '  },\n'
)

if module_anchor not in content:
    raise SystemExit("Could not locate Demand Planning module anchor.")

path.write_text(content.replace(module_anchor, entry + module_anchor, 1))
print("Added Logistics & Freight to the Enterprise Modules directory.")
