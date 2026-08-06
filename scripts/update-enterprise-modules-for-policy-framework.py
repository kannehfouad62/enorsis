from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/settings/policies"' in content:
    print("Enterprise Policy Framework is already present.")
    raise SystemExit(0)

entry = '''  {
    title: "Enterprise Policy Framework",
    description: "Versioned policies, tenant overrides and controlled feature flags.",
    href: "/app/settings/policies",
    icon: SlidersHorizontal,
    group: "Platform",
  },
'''

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Enterprise Policy Framework to the Enterprise Modules directory.")
