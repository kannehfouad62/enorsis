from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/claims"' in content:
    print("Returns, Claims & Recovery is already present.")
    raise SystemExit(0)

if "PackageX" not in content:
    anchor = "  PackageCheck,\n"
    if anchor not in content:
        raise SystemExit("Could not locate PackageCheck icon anchor.")
    content = content.replace(anchor, anchor + "  PackageX,\n", 1)

module_anchor = '  {\n    title: "Logistics & Freight",\n'
entry = (
    '  {\n'
    '    title: "Returns, Claims & Recovery",\n'
    '    description: "Returns, supplier claims, warranty cases and recovery.",\n'
    '    href: "/app/claims",\n'
    '    icon: PackageX,\n'
    '    group: "Procurement",\n'
    '  },\n'
)

if module_anchor not in content:
    raise SystemExit("Could not locate Logistics & Freight module anchor.")

path.write_text(content.replace(module_anchor, entry + module_anchor, 1))
print("Added Returns, Claims & Recovery to the Enterprise Modules directory.")
