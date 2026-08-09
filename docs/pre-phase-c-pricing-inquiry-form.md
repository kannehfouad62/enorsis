# Pricing Inquiry Form Repair

This repair removes the direct `mailto:` behavior from Pricing plan CTAs.

## New behavior

Each plan CTA links to:

`/pricing?plan=<PLAN>#pricing-inquiry`

The selected plan is prefilled in a dedicated responsive inquiry form.

Fields:
- Full Name
- Company
- Job Title
- Work Email
- Phone Number (optional)
- Country
- Plan
- required contact consent

## Submission

The form submits server-side through Resend.

Recipient:

`sales@enorsis.org`

The prospect's work email is set as `replyTo`, allowing the Enorsis sales team
to respond directly.

No visitor email client is opened.

## Environment variables

Required:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Recommended production value:

`RESEND_FROM_EMAIL="Enorsis Sales <sales@enorsis.org>"`

The sender domain must be verified in Resend.

## Privacy

The consent statement links to `/privacy`.

No Prisma migration is required.
