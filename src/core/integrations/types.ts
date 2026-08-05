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

export type ConnectorAdapterContext = {
  tenantId: string;
  connectionId: string;
  configuration: Record<string, unknown>;
  secretReferences: string[];
};

export type EnterpriseConnectorAdapter = {
  healthCheck(
    context: ConnectorAdapterContext,
  ): Promise<ConnectorHealthResult>;
  runSync(
    context: ConnectorAdapterContext & {
      direction: "INBOUND" | "OUTBOUND" | "BIDIRECTIONAL";
      mappingId?: string | null;
      cursor?: string | null;
    },
  ): Promise<ConnectorSyncResult>;
};
