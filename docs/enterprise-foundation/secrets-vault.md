# Secrets Vault & Secure Credential Management

A7 stores encrypted secret material using AES-256-GCM. The application master
key must be supplied through `ENORSIS_VAULT_MASTER_KEY` and must never be
committed to source control.

Generate the master key locally:

```bash
openssl rand -base64 32
```

Store the output as `ENORSIS_VAULT_MASTER_KEY` in local and production
environment-variable stores.

Secret plaintext is accepted only during creation, rotation, or authorized
service retrieval. The administration workspace never renders stored
plaintext.

Example service retrieval:

```ts
const token = await readVaultSecret({
  secretReference: "ENORSIS_SAP_API_TOKEN",
  tenantId,
  serviceKey: "platform:integration-hub",
  reason: "Execute SAP synchronization",
});
```
