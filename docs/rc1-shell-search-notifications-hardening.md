# RC1 Shell, Search & Notification Hardening

This RC1 hardening patch resolves production shell observations before final
release certification.

Fixes:
- Sidebar Spend Intelligence now points to `/app/analytics/spend`.
- Sidebar Risk & Governance now points to `/app/resilience`.
- The obsolete `/app/spend` and `/app/risk` navigation targets are removed.
- Global search is now functional rather than decorative.
- Global search queries tenant-scoped Suppliers, Purchase Requests, Contracts,
  and Governed Executive Insights.
- Search results respect broad role boundaries and return direct record links.
- Enterprise workspace/module matches are included in the same search panel.
- Search is debounced and aborts stale requests.
- Enter opens the first available result; Escape closes the result panel.
- The notification bell now opens the existing `/app/notifications`
  notification center.
- The misleading always-on unread indicator is removed until a live unread
  count is supplied by the shell.

No Prisma migration is required.
