# B2.8.5.5 — OpenAI-backed Executive Synthesis

Adds an optional generative synthesis layer above governed Enorsis executive
insights.

Guardrails:
- only governed insight/evidence payloads are sent
- no operational records are mutated
- model cannot approve/reject/escalate/dismiss
- human approval status remains authoritative
- source insight IDs must validate against the input set
- prompt version, model, response ID and input fingerprint are stored
- synthesis failures are auditable

Environment:

```text
OPENAI_API_KEY=...
OPENAI_EXECUTIVE_MODEL=gpt-5
```

Route:

```text
/app/executive/ai-synthesis
```
