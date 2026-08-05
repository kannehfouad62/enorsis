from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/categories"' in content:
    print("Categories & Market Intelligence is already present.")
    raise SystemExit(0)

if "ChartNetwork" not in content:
    anchor = "  ChartSpline,\n"
    if anchor not in content:
        raise SystemExit("Could not locate ChartSpline icon anchor.")
    content = content.replace(anchor, anchor + "  ChartNetwork,\n", 1)

module_anchor = '  {\n    title: "Savings & Value Realization",\n'
entry = (
    '  {\n'
    '    title: "Categories & Market Intelligence",\n'
    '    description: "Category strategies, opportunities and market signals.",\n'
    '    href: "/app/categories",\n'
    '    icon: ChartNetwork,\n'
    '    group: "Governance",\n'
    '  },\n'
)

if module_anchor not in content:
    raise SystemExit("Could not locate Savings & Value Realization module anchor.")

path.write_text(content.replace(module_anchor, entry + module_anchor, 1))
print("Added Categories & Market Intelligence to the Enterprise Modules directory.")
