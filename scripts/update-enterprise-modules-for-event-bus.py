from pathlib import Path
p=Path("src/modules/navigation/enterprise-modules.ts")
s=p.read_text()
if 'href: "/app/settings/events"' in s:
    print("Enterprise Event Bus is already present.")
    raise SystemExit(0)
entry='''  {
    title: "Enterprise Event Bus",
    description: "Domain events, subscriptions, deliveries and dead letters.",
    href: "/app/settings/events",
    icon: Network,
    group: "Platform",
  },
'''
anchor=s.rfind("\n];")
if anchor<0: raise SystemExit("Could not locate module array end.")
p.write_text(s[:anchor]+"\n"+entry+s[anchor:])
print("Added Enterprise Event Bus to the Enterprise Modules directory.")
