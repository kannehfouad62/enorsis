from pathlib import Path

path = Path(
    "src/components/automation/workflow-inspector.tsx"
)
content = path.read_text()

if '<option value="HTTP_REQUEST">' in content:
    print("Secure connector action types are already present.")
    raise SystemExit(0)

anchor = '''              <option value="PUBLISH_EVENT">
                Publish Event
              </option>'''

replacement = anchor + '''
              <option value="HTTP_REQUEST">
                HTTP Request
              </option>
              <option value="WEBHOOK">
                Webhook
              </option>
              <option value="SEND_EMAIL">
                Send Email
              </option>'''

if anchor not in content:
    raise SystemExit(
        "Could not locate action type selector anchor."
    )

path.write_text(
    content.replace(anchor, replacement, 1)
)

print("Added secure connector action types to workflow inspector.")
