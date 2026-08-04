from pathlib import Path

path = Path("src/modules/navigation/enterprise-modules.ts")
content = path.read_text()

if 'href: "/app/buying"' in content:
    print("Catalog & Guided Buying is already present.")
    raise SystemExit(0)

if "Store" not in content:
    anchor = "  ShoppingCart,\n"
    if anchor not in content:
        raise SystemExit("Could not locate ShoppingCart icon anchor.")
    content = content.replace(anchor, anchor + "  Store,\n", 1)

anchor = '  {\n    title: "Purchase Requests",\n'
entry = (
    '  {\n'
    '    title: "Catalog & Guided Buying",\n'
    '    description: "Preferred catalogs, shopping carts and policy-aligned buying.",\n'
    '    href: "/app/buying",\n'
    '    icon: Store,\n'
    '    group: "Procurement",\n'
    '  },\n'
)

if anchor not in content:
    raise SystemExit("Could not locate Purchase Requests module anchor.")

path.write_text(content.replace(anchor, entry + anchor, 1))
print("Added Catalog & Guided Buying to the Enterprise Modules directory.")
