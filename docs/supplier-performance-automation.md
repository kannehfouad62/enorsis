# Supplier Performance Automation

## Purpose

This release calculates draft and in-review scorecards from existing Enorsis
operational evidence.

## Evidence sources

The calculator uses:

- Purchase orders and requested delivery dates
- Purchase-order lines and received quantities
- Receipt timestamps
- Supplier invoices and match status
- Invoice exceptions
- Supplier risk assessments
- Open supplier risk findings
- ESG assessments
- Supplier compliance documents
- Open supplier corrective actions

## Conservative defaults

Where Enorsis does not yet store a defensible operational metric, the calculator
uses a neutral score instead of inventing data. Innovation currently defaults to
70 until innovation-specific evidence is introduced.

## Recalculation

Individual scorecards can be recalculated from the application through the
server action.

Protected bulk endpoint:

```text
GET /api/suppliers/performance/recalculate
Authorization: Bearer <CRON_SECRET>
```

Recommended scheduled frequency:

```json
{
  "path": "/api/suppliers/performance/recalculate",
  "schedule": "0 3 * * *"
}
```

## Trend logic

Published scorecards are grouped by supplier. The latest score is compared with
the preceding scorecard:

```text
More than +2 points  IMPROVING
Between -2 and +2    STABLE
Less than -2 points  DECLINING
```
