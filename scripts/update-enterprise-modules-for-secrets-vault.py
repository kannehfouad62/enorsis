from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/settings/secrets"' in content:
    print("Secrets Vault is already present.")
    raise SystemExit(0)

entry = '''  {
    title: "Secrets Vault",
    description: "Encrypted secrets, rotation, access policies and audit logs.",
    href: "/app/settings/secrets",
    icon: KeyRound,
    group: "Platform",
  },
'''

anchor = content.rfind("\n];")
if anchor == -1:
    raise SystemExit("Could not locate enterprise modules array end.")

path.write_text(content[:anchor] + "\n" + entry + content[anchor:])
print("Added Secrets Vault to the Enterprise Modules directory.")
