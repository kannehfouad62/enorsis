from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/inventory"' in content:
    print("Inventory & Materials is already present.")
    raise SystemExit(0)

if "Warehouse" not in content:
    anchor = "  Workflow,\n"
    if anchor not in content:
        raise SystemExit("Could not locate Workflow icon anchor.")
    content = content.replace(anchor, anchor + "  Warehouse,\n", 1)

module_anchor = '  {\n    title: "Catalog & Guided Buying",\n'
entry = (
    '  {\n'
    '    title: "Inventory & Materials",\n'
    '    description: "Stock locations, balances, movements and cycle counts.",\n'
    '    href: "/app/inventory",\n'
    '    icon: Warehouse,\n'
    '    group: "Procurement",\n'
    '  },\n'
)

if module_anchor not in content:
    raise SystemExit("Could not locate Catalog & Guided Buying module anchor.")

path.write_text(content.replace(module_anchor, entry + module_anchor, 1))
print("Added Inventory & Materials to the Enterprise Modules directory.")
