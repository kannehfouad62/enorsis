# Pre-Phase C — Visual & UX Stabilization

This pass completes three launch-readiness improvements before Phase C.

## Brand icon
`public/icon.svg` now uses the same orbit language as the Enorsis website logo
instead of a separate dark "E" icon.

## Landing animation
The legacy fixed-position globe animation is replaced by a responsive global
procurement network visualization representing:

- Enterprise
- Government
- SMB
- complete Source-to-Pay
- Request
- Source
- Contract
- Buy
- Receive
- Pay
- verified global supplier network
- cross-industry procurement
- governed AI
- multi-country / multi-currency operations

Mobile behavior is specifically redesigned rather than merely scaled down.

## Forms
The demo/workspace form is rebuilt as a readable light form.

Global native select option normalization prevents browser dropdown menus from
rendering unreadable black-on-black options, while avoiding a forced light
background on every internal application control.

## Validation
No Prisma migration is required.

Run:
- `npm run typecheck`
- enterprise module validators
- `npm run build`
