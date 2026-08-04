# Enorsis Navigation and Module Directory

## Purpose

As Enorsis expands, placing every route directly in the sidebar would create a
long and difficult navigation experience.

This release introduces a single sidebar entry:

```text
Enterprise Modules
```

It opens:

```text
/app/modules
```

The directory organizes current modules into:

- Procurement
- Suppliers
- Governance
- Intelligence
- Platform

## Applying the menu update

Run:

```bash
python3 scripts/update-enterprise-navigation.py
```

The script locates the existing application navigation file using current
Enorsis routes, adds the `LayoutGrid` icon import and inserts the Enterprise
Modules entry before the settings area.

The script stops without changing files if it cannot identify a safe insertion
point.
