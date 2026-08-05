from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/sustainability"' in content:
    print("Sustainable Procurement is already present.")
    raise SystemExit(0)

if "Leaf" not in content:
    anchor = "  Landmark,\n"
    if anchor not in content:
        raise SystemExit("Could not locate Landmark icon anchor.")
    content = content.replace(anchor, anchor + "  Leaf,\n", 1)

module_anchor = '  {\n    title: "Risk & Resilience",\n'
entry = (
    '  {\n'
    '    title: "Sustainable Procurement",\n'
    '    description: "Supplier ESG, emissions, diversity and responsible sourcing.",\n'
    '    href: "/app/sustainability",\n'
    '    icon: Leaf,\n'
    '    group: "Governance",\n'
    '  },\n'
)

if module_anchor not in content:
    raise SystemExit("Could not locate Risk & Resilience module anchor.")

path.write_text(content.replace(module_anchor, entry + module_anchor, 1))
print("Added Sustainable Procurement to the Enterprise Modules directory.")
