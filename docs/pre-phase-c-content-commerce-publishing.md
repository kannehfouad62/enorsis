# Pre-Phase C — Content, Commerce & Publishing Stabilization

This pass completes public-site publishing and pricing responsiveness.

## Pricing
All plan CTAs are actionable `mailto:` links to:

`sales@enorsis.org`

The subject identifies the selected pricing plan.

## Publications
Publications are now database-backed.

PLATFORM_SUPER_ADMIN may:
- create drafts
- publish
- unpublish
- mark featured content

Published content remains available on the public Resources site.

## Guides & eBooks
Guides are database-backed.

PLATFORM_SUPER_ADMIN may:
- upload PDF or EPUB
- save draft
- publish
- unpublish
- mark featured resources

Files are stored through the existing `@vercel/blob` dependency using public
Blob URLs because these resources are intended for public download.

Maximum upload size: 25 MB.

## Careers
Career openings are database-backed.

PLATFORM_SUPER_ADMIN may:
- create job openings
- save drafts
- publish
- withdraw
- set location
- employment type
- work arrangement
- closing date
- application URL or email

Public applicants can apply through the configured URL or email.

## Permission boundary
Only `PLATFORM_SUPER_ADMIN` can mutate public editorial content.

Tenant and supplier users may consume published content but do not inherit
editorial authority.

## Migration
`20260809110000_public_site_content_management`

## Validation
- `npx prisma format`
- `npx prisma generate`
- `npx prisma migrate deploy`
- migrate status/diff
- typecheck
- enterprise module validators
- production build
