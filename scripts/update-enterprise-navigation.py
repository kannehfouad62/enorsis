from pathlib import Path
import re

path = Path("src/components/app-shell/AppShell.tsx")

if not path.exists():
    raise SystemExit(f"Navigation file was not found: {path}")

content = path.read_text()

if "/app/modules" in content:
    print(f"Enterprise Modules is already present in {path}.")
    raise SystemExit(0)

lucide_pattern = re.compile(
    r'import\s*\{(?P<names>.*?)\}\s*from\s*["\']lucide-react["\'];',
    re.DOTALL,
)
match = lucide_pattern.search(content)

if not match:
    raise SystemExit(
        f"Could not find the lucide-react import in {path}."
    )

names = match.group("names")
if "LayoutGrid" not in names:
    cleaned = names.rstrip()
    separator = "," if cleaned and not cleaned.endswith(",") else ""
    replacement_names = f"{cleaned}{separator}\n  LayoutGrid,\n"
    content = (
        content[:match.start("names")]
        + replacement_names
        + content[match.end("names"):]
    )

command_center = (
    '  { href: "/app", label: "Command center", '
    'icon: Gauge, roles: [] },'
)

if command_center not in content:
    raise SystemExit(
        f"Could not find the Command center navigation entry in {path}."
    )

enterprise_modules = (
    '\n  { href: "/app/modules", label: "Enterprise modules", '
    'icon: LayoutGrid, roles: [] },'
)

content = content.replace(
    command_center,
    command_center + enterprise_modules,
    1,
)

path.write_text(content)
print(f"Added Enterprise Modules navigation entry to {path}.")
