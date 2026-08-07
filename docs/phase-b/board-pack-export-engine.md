# B2.8.6.2 — Board Pack Export Engine

Adds server-side exports from frozen ExecutiveBoardPack snapshots.

Formats:
- PDF via pdf-lib
- Word (.docx) via docx
- Excel (.xlsx) via exceljs
- PowerPoint (.pptx) via pptxgenjs

Each export:
- uses the immutable board-pack snapshot rather than live operational data
- records format, file name, byte size, user, timestamp and source fingerprint
- publishes an enterprise domain event
- writes an enterprise activity record
- is generated through a tenant-scoped, role-protected route

Install dependencies:

```bash
npm install pdf-lib docx exceljs pptxgenjs
```

Route pattern:

```text
GET /api/executive/board-packs/:packId/export/:format
```
