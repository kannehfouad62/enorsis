# Authentication and application shell

## Current implementation

Patch 002 introduces Auth.js with JWT sessions and an environment-configured
credentials provider. This provider exists only to make the protected product
experience usable before database-backed onboarding is implemented.

The session contains:

- user identifier;
- active tenant identifier, slug and name;
- tenant-scoped roles.

`proxy.ts` protects all `/app` routes. The nested product layout independently
checks the server session before rendering the application shell.

## Security boundary

A browser-provided tenant identifier is never treated as authoritative. Future
repositories and services will resolve the active tenant from the authenticated
server session and apply the tenant-query helpers introduced in Patch 001.

## Production identity roadmap

The development credentials provider will be replaced or supplemented with:

- database-backed users and memberships;
- invitation and activation workflows;
- password hashing or passwordless authentication;
- Microsoft Entra ID and Okta enterprise SSO;
- optional domain discovery;
- session revocation;
- multi-factor authentication controls;
- authentication and authorization audit events.

## Application shell

The product shell is intentionally separate from the public marketing chrome.
It includes role-aware navigation foundations, an organization context panel,
global search, notifications, user controls and a responsive mobile sidebar.
