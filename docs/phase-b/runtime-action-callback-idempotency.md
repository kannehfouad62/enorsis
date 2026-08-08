# B2.9.2.7 — Runtime Action Completion, External Callbacks & Idempotency

Adds persistent runtime action records, deterministic idempotency keys,
duplicate dispatch suppression, external acknowledgement/completion/failure
callbacks, callback deduplication, and restart-safe action continuation.

Callback endpoint:

```text
POST /api/automation/runtime/actions/{actionId}/callback
```

External callers send:

```text
x-enorsis-callback-token
```

Configure:

```text
ENORSIS_AUTOMATION_CALLBACK_TOKEN
```
