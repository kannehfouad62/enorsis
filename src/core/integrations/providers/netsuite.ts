import {
  constants,
  createHash,
  randomUUID,
  sign,
} from "node:crypto";

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

type CachedToken = {
  token: string;
  expiresAt: number;
};

const tokenCache = new Map<string, CachedToken>();

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function normalizedCredentialName(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]+/g, "_");
}

function credentialReference(
  context: ConnectorAdapterContext,
  names: string[],
) {
  const wanted = new Set(names.map(normalizedCredentialName));

  return (
    context.credentials.find((item) =>
      wanted.has(normalizedCredentialName(item.name)),
    ) ?? null
  );
}

function requiredSecret(
  context: ConnectorAdapterContext,
  names: string[],
) {
  const reference = credentialReference(context, names);

  if (!reference) {
    throw new Error(
      `Missing NetSuite credential reference: ${names[0]}.`,
    );
  }

  const value = resolveIntegrationSecret(
    reference.secretReference,
  );

  if (!value) {
    throw new Error(
      `NetSuite secret ${names[0]} resolved to an empty value.`,
    );
  }

  return value;
}

function optionalSecret(
  context: ConnectorAdapterContext,
  names: string[],
) {
  const reference = credentialReference(context, names);
  if (!reference) return null;

  const value = resolveIntegrationSecret(
    reference.secretReference,
  );

  return value || null;
}

function accountId(context: ConnectorAdapterContext) {
  const value = String(
    context.configuration.accountId ?? "",
  ).trim();

  if (!value) {
    throw new Error(
      "NetSuite connection configuration requires accountId.",
    );
  }

  return value;
}

function baseUrl(context: ConnectorAdapterContext) {
  if (context.baseUrl) {
    return context.baseUrl.replace(/\/+$/, "");
  }

  return `https://${accountId(context)
    .toLowerCase()
    .replaceAll("_", "-")}.suitetalk.api.netsuite.com`;
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll(/=+$/g, "");
}

function createClientAssertion(
  context: ConnectorAdapterContext,
) {
  const clientId = requiredSecret(context, [
    "NETSUITE_CLIENT_ID",
    "CLIENT_ID",
  ]);
  const certificateId = requiredSecret(context, [
    "NETSUITE_CERTIFICATE_ID",
    "CERTIFICATE_ID",
    "KID",
  ]);
  const privateKey = requiredSecret(context, [
    "NETSUITE_PRIVATE_KEY",
    "PRIVATE_KEY",
  ]);

  const tokenUrl =
    `${baseUrl(context)}/services/rest/auth/oauth2/v1/token`;

  const now = Math.floor(Date.now() / 1000);

  const header = {
    typ: "JWT",
    alg: "PS256",
    kid: certificateId,
  };

  const payload = {
    iss: clientId,
    scope: "rest_webservices",
    aud: tokenUrl,
    iat: now,
    exp: now + 300,
    jti: randomUUID(),
  };

  const signingInput = `${base64Url(
    JSON.stringify(header),
  )}.${base64Url(JSON.stringify(payload))}`;

  const signature = sign(
    "sha256",
    Buffer.from(signingInput),
    {
      key: privateKey,
      padding: constants.RSA_PKCS1_PSS_PADDING,
      saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
    },
  );

  return `${signingInput}.${base64Url(signature)}`;
}

async function requestClientCredentialsToken(
  context: ConnectorAdapterContext,
) {
  const cached = tokenCache.get(context.connectionId);

  if (
    cached &&
    cached.expiresAt > Date.now() + 60_000
  ) {
    return cached.token;
  }

  const tokenUrl = await assertSafeOutboundUrl(
    `${baseUrl(context)}/services/rest/auth/oauth2/v1/token`,
  );

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    30_000,
  );

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_assertion_type:
          "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        client_assertion:
          createClientAssertion(context),
      }),
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

    const data = record(payload);

    if (!response.ok) {
      throw new Error(
        `NetSuite OAuth token endpoint returned HTTP ${response.status}: ${JSON.stringify(
          data,
        ).slice(0, 1500)}`,
      );
    }

    const token =
      typeof data.access_token === "string"
        ? data.access_token
        : "";

    if (!token) {
      throw new Error(
        "NetSuite OAuth token endpoint did not return access_token.",
      );
    }

    const expiresIn = Number(
      data.expires_in ?? 3600,
    );

    tokenCache.set(context.connectionId, {
      token,
      expiresAt:
        Date.now() +
        (Number.isFinite(expiresIn)
          ? expiresIn
          : 3600) *
          1000,
    });

    return token;
  } finally {
    clearTimeout(timeout);
  }
}

async function accessToken(
  context: ConnectorAdapterContext,
) {
  const configuredMode = String(
    context.configuration.oauthMode ?? "",
  )
    .trim()
    .toUpperCase();

  const staticToken = optionalSecret(context, [
    "NETSUITE_ACCESS_TOKEN",
    "ACCESS_TOKEN",
    "BEARER_TOKEN",
  ]);

  if (
    configuredMode === "ACCESS_TOKEN" ||
    (staticToken &&
      configuredMode !== "CLIENT_CREDENTIALS")
  ) {
    return staticToken;
  }

  const hasClientId = Boolean(
    credentialReference(context, [
      "NETSUITE_CLIENT_ID",
      "CLIENT_ID",
    ]),
  );
  const hasCertificateId = Boolean(
    credentialReference(context, [
      "NETSUITE_CERTIFICATE_ID",
      "CERTIFICATE_ID",
      "KID",
    ]),
  );
  const hasPrivateKey = Boolean(
    credentialReference(context, [
      "NETSUITE_PRIVATE_KEY",
      "PRIVATE_KEY",
    ]),
  );

  if (
    configuredMode === "CLIENT_CREDENTIALS" ||
    (hasClientId &&
      hasCertificateId &&
      hasPrivateKey)
  ) {
    return requestClientCredentialsToken(context);
  }

  if (staticToken) return staticToken;

  throw new Error(
    "NetSuite requires either NETSUITE_ACCESS_TOKEN or OAuth 2.0 client credentials (NETSUITE_CLIENT_ID, NETSUITE_CERTIFICATE_ID, NETSUITE_PRIVATE_KEY).",
  );
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
    const token = await accessToken(context);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
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

function configuredRecordTypes(
  context: ConnectorAdapterContext,
) {
  const value = context.configuration.recordTypes;

  if (Array.isArray(value)) {
    const types = value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);

    if (types.length) return types;
  }

  return [
    "vendor",
    "purchaseOrder",
  ];
}

export const netsuiteAdapter: EnterpriseConnectorAdapter = {
  async healthCheck(context) {
    const payload = await getJson(
      context,
      "/services/rest/record/v1/vendor?limit=1",
    );

    return {
      healthy: true,
      message:
        "NetSuite SuiteTalk REST authentication succeeded.",
      details: {
        accountId: accountId(context),
        oauthMode:
          context.configuration.oauthMode ??
          (credentialReference(context, [
            "NETSUITE_ACCESS_TOKEN",
          ])
            ? "ACCESS_TOKEN"
            : "CLIENT_CREDENTIALS"),
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

    const recordTypes =
      configuredRecordTypes(context);
    let read = 0;
    let written = 0;
    let failed = 0;
    const diagnostics: Array<{
      recordType: string;
      externalId: string | null;
      status: "STAGED" | "FAILED";
      reason: string;
    }> = [];

    for (const recordType of recordTypes) {
      let offset = 0;

      for (
        let page = 0;
        page < 10;
        page += 1
      ) {
        const payload = await getJson(
          context,
          `/services/rest/record/v1/${encodeURIComponent(
            recordType,
          )}?limit=1000&offset=${offset}`,
        );

        const items = Array.isArray(
          payload.items,
        )
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
            diagnostics.push({
              recordType,
              externalId: null,
              status: "FAILED",
              reason:
                "NetSuite record did not include id/internalId.",
            });
            continue;
          }

          try {
            await prisma.enterpriseProviderRecord.upsert(
              {
                where: {
                  connectionId_objectType_externalId:
                    {
                      connectionId:
                        context.connectionId,
                      objectType:
                        recordType.toUpperCase(),
                      externalId,
                    },
                },
                create: {
                  tenantId: context.tenantId,
                  connectionId:
                    context.connectionId,
                  provider: "NETSUITE",
                  objectType:
                    recordType.toUpperCase(),
                  externalId,
                  payload: toJson(item),
                  checksum: checksum(item),
                  lastSyncRunId:
                    context.runId ?? null,
                },
                update: {
                  payload: toJson(item),
                  checksum: checksum(item),
                  lastSeenAt: new Date(),
                  lastSyncRunId:
                    context.runId ?? null,
                  active: true,
                },
              },
            );

            written += 1;
            diagnostics.push({
              recordType,
              externalId,
              status: "STAGED",
              reason:
                "NetSuite record staged successfully.",
            });
          } catch (error) {
            failed += 1;
            diagnostics.push({
              recordType,
              externalId,
              status: "FAILED",
              reason:
                error instanceof Error
                  ? error.message
                  : "Unknown NetSuite staging error.",
            });
          }
        }

        const hasMore =
          payload.hasMore === true;

        if (
          !hasMore ||
          items.length === 0
        ) {
          break;
        }

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
        accountId: accountId(context),
        recordTypes,
        stagedRecords: written,
        failedRecords: failed,
        diagnostics,
      },
    };
  },
};
