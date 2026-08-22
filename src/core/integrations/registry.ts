import type { EnterpriseConnectorAdapter } from "./types";
import { netsuiteAdapter } from "./providers/netsuite";
import { plaidTreasuryAdapter } from "./providers/plaid-treasury";

const adapters = new Map<string, EnterpriseConnectorAdapter>([
  ["netsuite", netsuiteAdapter],
  ["plaid-treasury", plaidTreasuryAdapter],
]);

export function registerEnterpriseConnectorAdapter(
  definitionKey: string,
  adapter: EnterpriseConnectorAdapter,
) {
  if (adapters.has(definitionKey)) {
    throw new Error(
      `Connector adapter ${definitionKey} is already registered.`,
    );
  }

  adapters.set(definitionKey, adapter);
}

export function getEnterpriseConnectorAdapter(
  definitionKey: string,
) {
  return adapters.get(definitionKey) ?? null;
}

export function listEnterpriseConnectorAdapters() {
  return [...adapters.keys()].sort();
}
