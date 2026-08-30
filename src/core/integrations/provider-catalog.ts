export type EnterpriseIntegrationProviderProfile = {
  definitionKey: string;
  provider: string;
  name: string;
  family: "ERP" | "SOURCE_TO_PAY" | "BANKING";
  credentialTypes: string[];
  supportedObjects: string[];
  supportedDirections: Array<
    "INBOUND" | "OUTBOUND" | "BIDIRECTIONAL"
  >;
  endpointHint: string;
  notes: string;
};

export const ENTERPRISE_INTEGRATION_PROVIDER_PROFILES =
  [
    {
      definitionKey: "plaid-treasury",
      provider: "Plaid",
      name: "Plaid Treasury / Bank Balance",
      family: "BANKING",
      credentialTypes: ["API_KEY", "CUSTOM"],
      supportedObjects: [
        "BANK_ACCOUNT",
        "TREASURY_BALANCE",
      ],
      supportedDirections: ["INBOUND"],
      endpointHint:
        "Plaid sandbox, development or production API; base URL may be omitted when environment is configured.",
      notes:
        "Credential references should be named PLAID_CLIENT_ID, PLAID_SECRET and PLAID_ACCESS_TOKEN. Set configuration.treasuryAccountMap to map Plaid account_id values to Enorsis TreasuryAccount IDs.",
    },
    {
      definitionKey: "netsuite",
      provider: "Oracle",
      name: "Oracle NetSuite SuiteTalk REST",
      family: "ERP",
      credentialTypes: [
        "OAUTH2",
        "BEARER_TOKEN",
        "CLIENT_CERTIFICATE",
        "CUSTOM",
      ],
      supportedObjects: [
        "VENDOR",
        "PURCHASE_ORDER",
        "INVOICE",
        "ACCOUNT",
      ],
      supportedDirections: ["INBOUND"],
      endpointHint:
        "https://<account>.suitetalk.api.netsuite.com",
      notes:
        "Preferred production mode is OAuth 2.0 client credentials using NETSUITE_CLIENT_ID, NETSUITE_CERTIFICATE_ID and NETSUITE_PRIVATE_KEY secret references. A NETSUITE_ACCESS_TOKEN reference remains supported for testing. Configure accountId, oauthMode and optional recordTypes; provider records are staged with checksums and sync diagnostics for audit and replay.",
    },
    {
      definitionKey: "sap-s4hana",
      provider: "SAP",
      name: "SAP S/4HANA",
      family: "ERP",
      credentialTypes: ["OAUTH2", "CLIENT_CERTIFICATE", "BASIC_AUTH"],
      supportedObjects: ["SUPPLIER", "PURCHASE_ORDER", "RECEIPT", "INVOICE", "MATERIAL", "COST_CENTER"],
      supportedDirections: ["INBOUND", "OUTBOUND", "BIDIRECTIONAL"],
      endpointHint: "SAP API Management, OData or approved S/4HANA service endpoint",
      notes: "Use tenant-specific SAP APIs and credential references. Native execution adapter is scheduled for the next provider wave.",
    },
    {
      definitionKey: "oracle-fusion",
      provider: "Oracle",
      name: "Oracle Fusion Cloud ERP",
      family: "ERP",
      credentialTypes: ["OAUTH2", "BASIC_AUTH"],
      supportedObjects: ["SUPPLIER", "PURCHASE_ORDER", "RECEIPT", "INVOICE", "REQUISITION", "COST_CENTER"],
      supportedDirections: ["INBOUND", "OUTBOUND", "BIDIRECTIONAL"],
      endpointHint: "Oracle Fusion REST API base URL for the tenant",
      notes: "Catalog profile; native execution adapter follows the NetSuite/Plaid production rollout.",
    },
    {
      definitionKey: "dynamics-365",
      provider: "Microsoft",
      name: "Microsoft Dynamics 365",
      family: "ERP",
      credentialTypes: ["OAUTH2"],
      supportedObjects: ["SUPPLIER", "PURCHASE_ORDER", "RECEIPT", "INVOICE", "PRODUCT", "FINANCIAL_DIMENSION"],
      supportedDirections: ["INBOUND", "OUTBOUND", "BIDIRECTIONAL"],
      endpointHint: "Dynamics 365 Finance or Business Central API endpoint",
      notes: "Catalog profile; use Microsoft Entra credential references.",
    },
    {
      definitionKey: "coupa",
      provider: "Coupa",
      name: "Coupa",
      family: "SOURCE_TO_PAY",
      credentialTypes: ["OAUTH2", "API_KEY"],
      supportedObjects: ["SUPPLIER", "REQUISITION", "PURCHASE_ORDER", "RECEIPT", "INVOICE", "CONTRACT"],
      supportedDirections: ["INBOUND", "OUTBOUND", "BIDIRECTIONAL"],
      endpointHint: "Coupa tenant API base URL",
      notes: "Catalog profile; use governed OAuth/API secret references and explicit object mappings.",
    },
    {
      definitionKey: "ariba",
      provider: "SAP",
      name: "SAP Ariba",
      family: "SOURCE_TO_PAY",
      credentialTypes: ["OAUTH2", "CLIENT_CERTIFICATE"],
      supportedObjects: ["SUPPLIER", "SOURCING_EVENT", "CONTRACT", "REQUISITION", "PURCHASE_ORDER", "INVOICE"],
      supportedDirections: ["INBOUND", "OUTBOUND", "BIDIRECTIONAL"],
      endpointHint: "SAP Ariba API or approved integration endpoint",
      notes: "Catalog profile; use realm-specific configuration and governed credentials.",
    },
    {
      definitionKey: "generic-rest",
      provider: "Enorsis",
      name: "Generic Enterprise REST",
      family: "ERP",
      credentialTypes: ["OAUTH2", "API_KEY", "BEARER_TOKEN", "BASIC_AUTH"],
      supportedObjects: ["CUSTOM"],
      supportedDirections: ["INBOUND", "OUTBOUND", "BIDIRECTIONAL"],
      endpointHint: "HTTPS API base URL",
      notes: "Use for governed ERP/API integrations not covered by a native provider profile.",
    },
  ] as const satisfies readonly EnterpriseIntegrationProviderProfile[];

export function getEnterpriseIntegrationProviderProfile(
  definitionKey: string,
) {
  return (
    ENTERPRISE_INTEGRATION_PROVIDER_PROFILES.find(
      (profile) => profile.definitionKey === definitionKey,
    ) ?? null
  );
}
