from pathlib import Path
path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()
if 'href: "/app/compliance"' in content:
    print("Policy & Compliance is already present.")
    raise SystemExit(0)
if "BookOpenCheck" not in content:
    anchor = "  Bot,\n"
    if anchor not in content:
        raise SystemExit("Could not locate icon import anchor.")
    content = content.replace(anchor, anchor + "  BookOpenCheck,\n", 1)
anchor = '  {\n    title: "Access Governance",\n'
entry = '  {\n    title: "Policy & Compliance",\n    description: "Policies, controls, testing and remediation.",\n    href: "/app/compliance",\n    icon: BookOpenCheck,\n    group: "Governance",\n  },\n'
if anchor not in content:
    raise SystemExit("Could not locate Access Governance module anchor.")
path.write_text(content.replace(anchor, entry + anchor, 1))
print("Added Policy & Compliance to the Enterprise Modules directory.")
