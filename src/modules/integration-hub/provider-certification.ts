export type ProviderCertificationLevel =
  | "IMPLEMENTED"
  | "CONFIGURATION_READY"
  | "HEALTH_VERIFIED"
  | "SYNC_VERIFIED"
  | "LIVE_CERTIFIED"
  | "CUSTOMER_ACCOUNT_REQUIRED";

export type ProviderCertificationPolicy = {
  definitionKey: string;
  externalPrerequisite?: string | null;
  sandboxCertificationAllowed: boolean;
  liveCertificationRequiresProduction: boolean;
};

const POLICIES: Record<string, ProviderCertificationPolicy> = {
  "plaid-treasury": {
    definitionKey: "plaid-treasury",
    externalPrerequisite: null,
    sandboxCertificationAllowed: true,
    liveCertificationRequiresProduction: false,
  },
  netsuite: {
    definitionKey: "netsuite",
    externalPrerequisite:
      "A customer or licensed Oracle NetSuite account with SuiteTalk REST and OAuth 2.0 access is required for live certification.",
    sandboxCertificationAllowed: true,
    liveCertificationRequiresProduction: false,
  },
};

export function getProviderCertificationPolicy(
  definitionKey: string,
) {
  return (
    POLICIES[definitionKey] ?? {
      definitionKey,
      externalPrerequisite: null,
      sandboxCertificationAllowed: true,
      liveCertificationRequiresProduction: false,
    }
  );
}
