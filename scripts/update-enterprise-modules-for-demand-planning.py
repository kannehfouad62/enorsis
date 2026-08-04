from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/demand-planning"' in content:
    print("Demand Planning & Replenishment is already present.")
    raise SystemExit(0)

if "ChartSpline" not in content:
    anchor = "  ChartNoAxesCombined,\n"
    if anchor not in content:
        raise SystemExit("Could not locate ChartNoAxesCombined icon anchor.")
    content = content.replace(anchor, anchor + "  ChartSpline,\n", 1)

module_anchor = '  {\n    title: "Services & Workforce",\n'
entry = (
    '  {\n'
    '    title: "Demand Planning & Replenishment",\n'
    '    description: "Forecast demand and generate governed replenishment proposals.",\n'
    '    href: "/app/demand-planning",\n'
    '    icon: ChartSpline,\n'
    '    group: "Procurement",\n'
    '  },\n'
)

if module_anchor not in content:
    raise SystemExit("Could not locate Services & Workforce module anchor.")

path.write_text(content.replace(module_anchor, entry + module_anchor, 1))
print("Added Demand Planning & Replenishment to the Enterprise Modules directory.")
