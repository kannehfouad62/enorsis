from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/services"' in content:
    print("Services & Workforce is already present.")
    raise SystemExit(0)

if "UserRoundCog" not in content:
    anchor = "  Users,\n"
    if anchor not in content:
        raise SystemExit("Could not locate Users icon anchor.")
    content = content.replace(anchor, anchor + "  UserRoundCog,\n", 1)

module_anchor = '  {\n    title: "Inventory & Materials",\n'
entry = (
    '  {\n'
    '    title: "Services & Workforce",\n'
    '    description: "Statements of work, external workers, time and milestones.",\n'
    '    href: "/app/services",\n'
    '    icon: UserRoundCog,\n'
    '    group: "Procurement",\n'
    '  },\n'
)

if module_anchor not in content:
    raise SystemExit("Could not locate Inventory & Materials module anchor.")

path.write_text(content.replace(module_anchor, entry + module_anchor, 1))
print("Added Services & Workforce to the Enterprise Modules directory.")
