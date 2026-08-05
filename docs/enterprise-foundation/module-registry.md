# Central Module Registry

The registry enriches every enterprise module with:

- Stable module ID
- Route and navigation group
- Required commercial feature
- Permitted roles
- API, mobile, reporting, and search support
- Future AI eligibility
- Active status

The tenant-facing `/app/modules` directory now filters modules using both
RBAC and tenant licensing.

Platform operators can inspect the full registry at:

```text
/app/settings/modules
```

This milestone uses the existing visual module catalog as a transitional input.
A later foundation milestone can remove that compatibility layer entirely.
