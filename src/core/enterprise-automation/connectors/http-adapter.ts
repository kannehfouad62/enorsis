import type {
  AutomationConnectorAdapter,
  AutomationConnectorExecutionInput,
} from "./types";
import {
  resolveConnectorSecret,
  validateAutomationConnectorUrl,
} from "./security";

type HttpAdapterConfig = {
  url: string;
  method?: string;
  allowedHosts?: string[];
  secretEnvKey?: string | null;
  authHeader?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  asyncResponse?: boolean;
};

function config(
  input: AutomationConnectorExecutionInput,
): HttpAdapterConfig {
  const raw = input.configuration.connector;

  if (!raw || typeof raw !== "object") {
    throw new Error(
      "HTTP action requires a connector configuration object.",
    );
  }

  return raw as HttpAdapterConfig;
}

export const httpAutomationConnectorAdapter: AutomationConnectorAdapter = {
  async execute(input) {
    const cfg = config(input);
    const parsed = validateAutomationConnectorUrl({
      url: cfg.url,
      allowedHosts: cfg.allowedHosts ?? [],
    });

    const secret = resolveConnectorSecret(
      cfg.secretEnvKey,
    );

    const headers = new Headers({
      "content-type": "application/json",
      "x-enorsis-idempotency-key":
        input.idempotencyKey,
      ...(cfg.headers ?? {}),
    });

    if (secret) {
      headers.set(
        cfg.authHeader ?? "authorization",
        cfg.authHeader
          ? secret
          : `Bearer ${secret}`,
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Math.max(
        1000,
        Math.min(120000, cfg.timeoutMs ?? 15000),
      ),
    );

    try {
      const response = await fetch(parsed, {
        method: String(cfg.method ?? "POST").toUpperCase(),
        headers,
        body: JSON.stringify({
          actionId: input.actionId,
          actionType: input.actionType,
          idempotencyKey: input.idempotencyKey,
          configuration: input.configuration,
          input: input.input,
        }),
        signal: controller.signal,
        redirect: "error",
      });

      const text = await response.text();
      let payload: Record<string, unknown> = {};

      if (text) {
        try {
          payload = JSON.parse(text) as Record<
            string,
            unknown
          >;
        } catch {
          payload = { body: text.slice(0, 4000) };
        }
      }

      if (!response.ok) {
        throw new Error(
          `Connector request failed with HTTP ${response.status}.`,
        );
      }

      const payloadReference =
        typeof payload.reference === "string"
          ? payload.reference
          : null;

      const externalReference =
        response.headers.get("x-request-id") ??
        payloadReference;

      if (cfg.asyncResponse) {
        return {
          mode: "ASYNC",
          externalReference,
          payload,
        };
      }

      return {
        mode: "COMPLETED",
        externalReference,
        payload,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};
