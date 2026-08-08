# Enterprise Modules Visibility & Registry Synchronization

This hardening block fixes an access-ordering bug in the Enterprise Modules
directory.

Problem:
`getAccessibleModules()` evaluated role membership before checking whether the
user is a platform operator. As a result, PLATFORM_SUPER_ADMIN,
PLATFORM_SUPPORT and PLATFORM_AUDITOR users could be excluded from modules
whose default roles were tenant roles, including newly added Intelligence/RAG
workspaces.

Fix:
- platform operators now bypass tenant role filtering for every active module
- stale `/app/ai` registry metadata is replaced with current B4 AI routes
- stale `/app/procure-to-pay` metadata is replaced with
  `/app/requisition-to-order`
- B4 AI/RAG modules receive explicit AI_PLATFORM licensing metadata
- adds registry-consistency validation

Run:
`node scripts/apply-enterprise-modules-visibility-fix.mjs`
`node scripts/validate-enterprise-module-registry.mjs`

No Prisma migration is required.
