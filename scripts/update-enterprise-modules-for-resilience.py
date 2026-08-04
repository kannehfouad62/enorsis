from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/resilience"' in content:
    print("Risk & Resilience is already present.")
    raise SystemExit(0)

if "ShieldAlert" not in content:
    anchor = "  ShieldCheck,\n"
    if anchor not in content:
        raise SystemExit("Could not locate ShieldCheck icon anchor.")
    content = content.replace(anchor, anchor + "  ShieldAlert,\n", 1)

module_anchor = '''  {
    title: "Policy & Compliance",
'''

entry = '''  {
    title: "Risk & Resilience",
    description: "Disruptions, exposure, continuity plans and recovery.",
    href: "/app/resilience",
    icon: ShieldAlert,
    group: "Governance",
  },
'''

if module_anchor not in content:
    raise SystemExit("Could not locate Policy & Compliance module anchor.")

path.write_text(content.replace(module_anchor, entry + module_anchor, 1))
print("Added Risk & Resilience to the Enterprise Modules directory.")
