export type ConnectorHealthResult = {
  healthy: boolean;
  message: string;
  details?: Record<string, unknown>;
};

export type ConnectorSyncResult = {
  recordsRead: number;
  recordsWritten: number;
  recordsSkipped: number;
  recordsFailed: number;
  summary?: Record<string, unknown>;
};

export type ConnectorCredentialReference = {
  name: string;
  credentialType: string;
  secretReference: string;
};

export type ConnectorAdapterContext = {
  tenantId: string;
  connectionId: string;
  baseUrl?: string | null;
  configuration: Record<string, unknown>;
  secretReferences: string[];
  credentials: ConnectorCredentialReference[];
};

export type EnterpriseConnectorAdapter = {
  healthCheck(
    context: ConnectorAdapterContext,
  ): Promise<ConnectorHealthResult>;
  runSync(
    context: ConnectorAdapterContext & {
      runId?: string | null;
      direction: "INBOUND" | "OUTBOUND" | "BIDIRECTIONAL";
      mappingId?: string | null;
      cursor?: string | null;
    },
  ): Promise<ConnectorSyncResult>;
};
