from pathlib import Path
p=Path("src/modules/navigation/enterprise-modules.ts")
s=p.read_text()
if 'href: "/app/settings/licensing"' in s:
    print("Licensing & Entitlements is already present.")
    raise SystemExit(0)

entry = (
    '  {\n'
    '    title: "Licensing & Entitlements",\n'
    '    description: "Commercial editions, subscriptions and tenant feature access.",\n'
    '    href: "/app/settings/licensing",\n'
    '    icon: Users,\n'
    '    group: "Administration",\n'
    '  },\n'
)

i=s.rfind("\n];")
if i<0:
    raise SystemExit("Could not locate enterprise modules array end.")
p.write_text(s[:i]+"\n"+entry+s[i:])
print("Added Licensing & Entitlements to the Enterprise Modules directory.")
