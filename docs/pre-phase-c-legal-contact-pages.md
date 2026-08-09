# Pre-Phase C — Legal Pages & Contact Us

Adds public pages:

- `/privacy`
- `/terms`
- `/cookies`
- `/accessibility`
- `/contact`

Contact Us form fields:
- Name
- Email
- Organization
- Area of interest
- Website
- Message

Submission recipient:
`info@enorsis.org`

Email is sent server-side through Resend with the visitor email set as `replyTo`.

Required environment variables:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Navigation installer:
`node scripts/apply-legal-contact-navigation.mjs`

It searches the existing public navigation/footer source rather than assuming a
specific component filename.

No Prisma migration is required.

Note: these legal pages are general product/site drafts and should receive legal
review before commercial launch, especially for jurisdiction-specific privacy,
data-processing, cookies and limitation-of-liability requirements.
