from pathlib import Path

candidates = [
    Path("src/app/api/workflows/process-sla/route.ts"),
    Path("src/app/api/cron/hourly/route.ts"),
    Path("src/app/api/scheduler/hourly/route.ts"),
]

existing = [path for path in candidates if path.exists()]

if not existing:
    print(
        "No known hourly scheduler route found. "
        "Import runEnterpriseAutomationConnectorCycle "
        "into the existing hourly scheduler manually."
    )
    raise SystemExit(0)

path = existing[0]
content = path.read_text()

if "runEnterpriseAutomationConnectorCycle" in content:
    print(
        f"Connector cycle already integrated in {path}."
    )
    raise SystemExit(0)

print(
    f"Existing scheduler detected: {path}. "
    "Do not create another cron route. "
    "Add runEnterpriseAutomationConnectorCycle() "
    "to this existing scheduler."
)
