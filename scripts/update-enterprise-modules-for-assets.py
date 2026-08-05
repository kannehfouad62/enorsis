from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/assets"' in content:
    print("Assets & Equipment is already present.")
    raise SystemExit(0)

if "Wrench" not in content:
    anchor = "  Warehouse,\n"
    if anchor not in content:
        raise SystemExit("Could not locate Warehouse icon anchor.")
    content = content.replace(anchor, anchor + "  Wrench,\n", 1)

module_anchor = '  {\n    title: "Returns, Claims & Recovery",\n'
entry = (
    '  {\n'
    '    title: "Assets & Equipment",\n'
    '    description: "Asset custody, warranties, maintenance and retirement.",\n'
    '    href: "/app/assets",\n'
    '    icon: Wrench,\n'
    '    group: "Procurement",\n'
    '  },\n'
)

if module_anchor not in content:
    raise SystemExit("Could not locate Returns, Claims & Recovery module anchor.")

path.write_text(content.replace(module_anchor, entry + module_anchor, 1))
print("Added Assets & Equipment to the Enterprise Modules directory.")
