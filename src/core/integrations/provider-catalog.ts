export type EnterpriseIntegrationProviderProfile = {
  definitionKey: string;
  provider: string;
  name: string;
  family: "ERP" | "SOURCE_TO_PAY";
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
      definitionKey: "sap-s4hana",
      provider: "SAP",
      name: "SAP S/4HANA",
      family: "ERP",
      credentialTypes: [
        "OAUTH2",
        "CLIENT_CERTIFICATE",
        "BASIC_AUTH",
      ],
      supportedObjects: [
        "SUPPLIER",
        "PURCHASE_ORDER",
        "RECEIPT",
        "INVOICE",
        "MATERIAL",
        "COST_CENTER",
      ],
      supportedDirections: [
        "INBOUND",
        "OUTBOUND",
        "BIDIRECTIONAL",
      ],
      endpointHint:
        "SAP API Management, OData or approved S/4HANA service endpoint",
      notes:
        "Use tenant-specific SAP APIs and credential references. Do not store SAP credentials in connector configuration.",
    },
    {
      definitionKey: "oracle-fusion",
      provider: "Oracle",
      name: "Oracle Fusion Cloud ERP",
      family: "ERP",
      credentialTypes: ["OAUTH2", "BASIC_AUTH"],
      supportedObjects: [
        "SUPPLIER",
        "PURCHASE_ORDER",
        "RECEIPT",
        "INVOICE",
        "REQUISITION",
        "COST_CENTER",
      ],
      supportedDirections: [
        "INBOUND",
        "OUTBOUND",
        "BIDIRECTIONAL",
      ],
      endpointHint:
        "Oracle Fusion REST API base URL for the tenant",
      notes:
        "Use Oracle REST resources and secret references managed outside connector configuration.",
    },
    {
      definitionKey: "dynamics-365",
      provider: "Microsoft",
      name: "Microsoft Dynamics 365",
      family: "ERP",
      credentialTypes: ["OAUTH2"],
      supportedObjects: [
        "SUPPLIER",
        "PURCHASE_ORDER",
        "RECEIPT",
        "INVOICE",
        "PRODUCT",
        "FINANCIAL_DIMENSION",
      ],
      supportedDirections: [
        "INBOUND",
        "OUTBOUND",
        "BIDIRECTIONAL",
      ],
      endpointHint:
        "Dynamics 365 Finance or Business Central API endpoint",
      notes:
        "Use Microsoft Entra application credentials through a secret reference.",
    },
    {
      definitionKey: "coupa",
      provider: "Coupa",
      name: "Coupa",
      family: "SOURCE_TO_PAY",
      credentialTypes: ["OAUTH2", "API_KEY"],
      supportedObjects: [
        "SUPPLIER",
        "REQUISITION",
        "PURCHASE_ORDER",
        "RECEIPT",
        "INVOICE",
        "CONTRACT",
      ],
      supportedDirections: [
        "INBOUND",
        "OUTBOUND",
        "BIDIRECTIONAL",
      ],
      endpointHint: "Coupa tenant API base URL",
      notes:
        "Use Coupa OAuth/API credentials through Enorsis secret references and explicit object mappings.",
    },
    {
      definitionKey: "ariba",
      provider: "SAP",
      name: "SAP Ariba",
      family: "SOURCE_TO_PAY",
      credentialTypes: ["OAUTH2", "CLIENT_CERTIFICATE"],
      supportedObjects: [
        "SUPPLIER",
        "SOURCING_EVENT",
        "CONTRACT",
        "REQUISITION",
        "PURCHASE_ORDER",
        "INVOICE",
      ],
      supportedDirections: [
        "INBOUND",
        "OUTBOUND",
        "BIDIRECTIONAL",
      ],
      endpointHint:
        "SAP Ariba API or approved integration endpoint",
      notes:
        "Use Ariba API credentials and realm-specific configuration through governed secret references.",
    },
    {
      definitionKey: "generic-rest",
      provider: "Enorsis",
      name: "Generic Enterprise REST",
      family: "ERP",
      credentialTypes: [
        "OAUTH2",
        "API_KEY",
        "BEARER_TOKEN",
        "BASIC_AUTH",
      ],
      supportedObjects: ["CUSTOM"],
      supportedDirections: [
        "INBOUND",
        "OUTBOUND",
        "BIDIRECTIONAL",
      ],
      endpointHint: "HTTPS API base URL",
      notes:
        "Use for governed ERP/API integrations not covered by a native provider profile.",
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
