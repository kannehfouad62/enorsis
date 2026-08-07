from pathlib import Path

candidates = [
    Path("src/app/api/workflows/process-sla/route.ts"),
    Path("src/app/api/cron/process-sla/route.ts"),
    Path("src/app/api/workflows/hourly/route.ts"),
    Path("src/app/api/cron/hourly/route.ts"),
]

for path in candidates:
    if path.exists():
        print(path)
        print("---")
        print(path.read_text())
        raise SystemExit(0)

print("No known scheduler route was found.")
print(
    "Do not create a duplicate cron route. "
    "Import runScheduledExecutiveBoardReporting into the existing scheduler."
)
