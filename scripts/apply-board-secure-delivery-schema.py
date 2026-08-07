from pathlib import Path

path = Path("prisma/schema.prisma")
schema = path.read_text()

def bounds(text, model):
    start = text.find(f"model {model} {{")
    if start < 0:
        raise SystemExit(f"Could not locate {model} model.")
    opening = text.find("{", start)
    depth = 0
    for i in range(opening, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return start, i
    raise SystemExit(f"Could not locate end of {model} model.")

start, end = bounds(schema, "ExecutiveBoardDelivery")
block = schema[start:end]

fields = [
    ("accessExpiresAt", "  accessExpiresAt       DateTime?"),
    ("emailMessageId", "  emailMessageId        String?"),
    ("lastAccessAt", "  lastAccessAt           DateTime?"),
]

for field, line in fields:
    if f"\n  {field}" not in block:
        anchor = block.find("\n  tenant")
        if anchor < 0:
            raise SystemExit("Could not locate ExecutiveBoardDelivery field anchor.")
        block = block[:anchor] + "\n" + line + block[anchor:]

schema = schema[:start] + block + schema[end:]
path.write_text(schema)
print("Executive board secure delivery schema applied.")
