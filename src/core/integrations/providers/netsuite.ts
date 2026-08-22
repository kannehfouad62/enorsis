import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/prisma-json";
import {
  assertSafeOutboundUrl,
  resolveIntegrationSecret,
} from "../delivery";
import type {
  ConnectorAdapterContext,
  EnterpriseConnectorAdapter,
} from "../types";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function accessToken(context: ConnectorAdapterContext) {
  const match = context.credentials.find((item) =>
    [
      "NETSUITE_ACCESS_TOKEN",
      "ACCESS_TOKEN",
      "BEARER_TOKEN",
    ].includes(
      item.name
        .trim()
        .toUpperCase()
        .replaceAll(/[^A-Z0-9]+/g, "_"),
    ),
  );

  if (!match) {
    throw new Error(
      "NetSuite requires an OAuth bearer access-token secret reference.",
    );
  }

  return resolveIntegrationSecret(match.secretReference);
}

function baseUrl(context: ConnectorAdapterContext) {
  if (context.baseUrl) return context.baseUrl.replace(/\/+$/, "");

  const accountId = String(
    context.configuration.accountId ?? "",
  ).trim();

  if (!accountId) {
    throw new Error(
      "NetSuite connection configuration requires accountId or an explicit base URL.",
    );
  }

  return `https://${accountId.toLowerCase().replaceAll("_", "-")}.suitetalk.api.netsuite.com`;
}

async function getJson(
  context: ConnectorAdapterContext,
  path: string,
) {
  const url = await assertSafeOutboundUrl(
    `${baseUrl(context)}${path}`,
  );
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    30_000,
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken(context)}`,
      },
      signal: controller.signal,
      redirect: "error",
      cache: "no-store",
    });

    const text = await response.text();
    let payload: unknown = {};

    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text.slice(0, 5000) };
    }

    if (!response.ok) {
      throw new Error(
        `NetSuite returned HTTP ${response.status}: ${JSON.stringify(
          payload,
        ).slice(0, 1500)}`,
      );
    }

    return record(payload);
  } finally {
    clearTimeout(timeout);
  }
}

function checksum(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function configuredRecordTypes(context: ConnectorAdapterContext) {
  const value = context.configuration.recordTypes;

  if (Array.isArray(value)) {
    const types = value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
    if (types.length) return types;
  }

  return ["vendor", "purchaseOrder"];
}

export const netsuiteAdapter: EnterpriseConnectorAdapter = {
  async healthCheck(context) {
    const payload = await getJson(
      context,
      "/services/rest/record/v1/vendor?limit=1",
    );

    return {
      healthy: true,
      message: "NetSuite SuiteTalk REST authentication succeeded.",
      details: {
        count: payload.count ?? null,
        hasMore: payload.hasMore ?? null,
      },
    };
  },

  async runSync(context) {
    if (context.direction === "OUTBOUND") {
      throw new Error(
        "NetSuite v1 native adapter currently supports governed inbound synchronization.",
      );
    }

    const recordTypes = configuredRecordTypes(context);
    let read = 0;
    let written = 0;
    let failed = 0;

    for (const recordType of recordTypes) {
      let offset = 0;

      for (let page = 0; page < 10; page += 1) {
        const payload = await getJson(
          context,
          `/services/rest/record/v1/${encodeURIComponent(
            recordType,
          )}?limit=1000&offset=${offset}`,
        );

        const items = Array.isArray(payload.items)
          ? payload.items
          : [];

        for (const raw of items) {
          read += 1;
          const item = record(raw);
          const externalId = String(
            item.id ??
              item.internalId ??
              "",
          );

          if (!externalId) {
            failed += 1;
            continue;
          }

          await prisma.enterpriseProviderRecord.upsert({
            where: {
              connectionId_objectType_externalId: {
                connectionId: context.connectionId,
                objectType: recordType.toUpperCase(),
                externalId,
              },
            },
            create: {
              tenantId: context.tenantId,
              connectionId: context.connectionId,
              provider: "NETSUITE",
              objectType: recordType.toUpperCase(),
              externalId,
              payload: toJson(item),
              checksum: checksum(item),
              lastSyncRunId: context.runId ?? null,
            },
            update: {
              payload: toJson(item),
              checksum: checksum(item),
              lastSeenAt: new Date(),
              lastSyncRunId: context.runId ?? null,
              active: true,
            },
          });

          written += 1;
        }

        const hasMore = payload.hasMore === true;
        if (!hasMore || items.length === 0) break;

        offset += items.length;
      }
    }

    return {
      recordsRead: read,
      recordsWritten: written,
      recordsSkipped: 0,
      recordsFailed: failed,
      summary: {
        provider: "NETSUITE",
        recordTypes,
        stagedRecords: written,
      },
    };
  },
};
