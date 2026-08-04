from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/reviews"' in content:
    print("Executive Reviews is already present.")
    raise SystemExit(0)

if "Presentation" not in content:
    content = content.replace("  PackageCheck,\n", "  PackageCheck,\n  Presentation,\n", 1)

anchor = '  {\n    title: "Spend Intelligence",\n'
entry = '  {\n    title: "Executive Reviews",\n    description: "Operating reviews, KPI packs, decisions and action tracking.",\n    href: "/app/reviews",\n    icon: Presentation,\n    group: "Intelligence",\n  },\n'

if anchor not in content:
    raise SystemExit("Could not find the Spend Intelligence module anchor.")

path.write_text(content.replace(anchor, entry + anchor, 1))
print("Added Executive Reviews to the Enterprise Modules directory.")
