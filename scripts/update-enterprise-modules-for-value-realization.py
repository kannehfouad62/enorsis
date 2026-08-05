from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/value-realization"' in content:
    print("Savings & Value Realization is already present.")
    raise SystemExit(0)

if "BadgeDollarSign" not in content:
    anchor = "  Bot,\n"
    if anchor not in content:
        raise SystemExit("Could not locate Bot icon anchor.")
    content = content.replace(anchor, anchor + "  BadgeDollarSign,\n", 1)

module_anchor = '  {\n    title: "Sustainable Procurement",\n'
entry = (
    '  {\n'
    '    title: "Savings & Value Realization",\n'
    '    description: "Initiatives, finance-validated benefits and value leakage.",\n'
    '    href: "/app/value-realization",\n'
    '    icon: BadgeDollarSign,\n'
    '    group: "Governance",\n'
    '  },\n'
)

if module_anchor not in content:
    raise SystemExit("Could not locate Sustainable Procurement module anchor.")

path.write_text(content.replace(module_anchor, entry + module_anchor, 1))
print("Added Savings & Value Realization to the Enterprise Modules directory.")
