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

function credential(
  context: ConnectorAdapterContext,
  names: string[],
) {
  const wanted = new Set(
    names.map((name) => name.toUpperCase()),
  );

  const match = context.credentials.find((item) =>
    wanted.has(
      item.name
        .trim()
        .toUpperCase()
        .replaceAll(/[^A-Z0-9]+/g, "_"),
    ),
  );

  if (!match) {
    throw new Error(
      `Missing credential reference: ${names[0]}.`,
    );
  }

  const secret =
    resolveIntegrationSecret(match.secretReference);

  if (!secret) {
    throw new Error(
      `Integration secret for ${names[0]} resolved to an empty value.`,
    );
  }

  return secret;
}

function plaidBaseUrl(context: ConnectorAdapterContext) {
  if (context.baseUrl) return context.baseUrl.replace(/\/+$/, "");

  const environment = String(
    context.configuration.environment ?? "production",
  ).toLowerCase();

  if (environment === "sandbox") return "https://sandbox.plaid.com";
  if (environment === "development") return "https://development.plaid.com";
  return "https://production.plaid.com";
}

async function plaidPost(
  context: ConnectorAdapterContext,
  path: string,
) {
  const clientId = credential(context, [
    "PLAID_CLIENT_ID",
    "CLIENT_ID",
  ]);
  const secret = credential(context, [
    "PLAID_SECRET",
    "SECRET",
  ]);
  const accessToken = credential(context, [
    "PLAID_ACCESS_TOKEN",
    "ACCESS_TOKEN",
  ]);

  const url = await assertSafeOutboundUrl(
    `${plaidBaseUrl(context)}${path}`,
  );

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    35_000,
  );

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
      body: JSON.stringify({
        access_token: accessToken,
      }),
      signal: controller.signal,
      redirect: "error",
      cache: "no-store",
    });

    const payload = record(await response.json());

    if (!response.ok) {
      throw new Error(
        `Plaid returned HTTP ${response.status}: ${JSON.stringify(
          payload,
        ).slice(0, 1500)}`,
      );
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function checksum(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function accountMap(context: ConnectorAdapterContext) {
  return record(context.configuration.treasuryAccountMap);
}

export const plaidTreasuryAdapter: EnterpriseConnectorAdapter = {
  async healthCheck(context) {
    const item = await plaidPost(context, "/item/get");
    const itemData = record(item.item);

    return {
      healthy: true,
      message: "Plaid Item authentication succeeded.",
      details: {
        itemId: itemData.item_id ?? null,
        institutionId: itemData.institution_id ?? null,
        environment:
          context.configuration.environment ?? "production",
      },
    };
  },

  async runSync(context) {
    if (context.direction === "OUTBOUND") {
      throw new Error(
        "Plaid Treasury v1 is an inbound balance connector.",
      );
    }

    const response = await plaidPost(
      context,
      "/accounts/balance/get",
    );
    const accounts = Array.isArray(response.accounts)
      ? response.accounts
      : [];
    const map = accountMap(context);

    let written = 0;
    let skipped = 0;
    let failed = 0;
    const now = new Date();
    const balanceDate = new Date(now);
    balanceDate.setMinutes(0, 0, 0);

    for (const raw of accounts) {
      const account = record(raw);
      const externalId = String(account.account_id ?? "");
      if (!externalId) {
        failed += 1;
        continue;
      }

      await prisma.enterpriseProviderRecord.upsert({
        where: {
          connectionId_objectType_externalId: {
            connectionId: context.connectionId,
            objectType: "BANK_ACCOUNT",
            externalId,
          },
        },
        create: {
          tenantId: context.tenantId,
          connectionId: context.connectionId,
          provider: "PLAID",
          objectType: "BANK_ACCOUNT",
          externalId,
          payload: toJson(account),
          checksum: checksum(account),
          lastSyncRunId: context.runId ?? null,
        },
        update: {
          payload: toJson(account),
          checksum: checksum(account),
          lastSeenAt: now,
          lastSyncRunId: context.runId ?? null,
          active: true,
        },
      });

      const treasuryAccountId =
        typeof map[externalId] === "string"
          ? String(map[externalId])
          : null;

      if (!treasuryAccountId) {
        skipped += 1;
        continue;
      }

      const treasuryAccount =
        await prisma.treasuryAccount.findFirst({
          where: {
            id: treasuryAccountId,
            tenantId: context.tenantId,
            active: true,
          },
        });

      if (!treasuryAccount) {
        failed += 1;
        continue;
      }

      const balances = record(account.balances);
      const currencyCode = String(
        balances.iso_currency_code ??
          treasuryAccount.currencyCode,
      ).toUpperCase();

      if (currencyCode !== treasuryAccount.currencyCode) {
        failed += 1;
        continue;
      }

      const current =
        balances.current == null
          ? null
          : Number(balances.current);
      const available =
        balances.available == null
          ? current
          : Number(balances.available);

      if (
        available == null ||
        !Number.isFinite(available)
      ) {
        failed += 1;
        continue;
      }

      await prisma.treasuryBalanceSnapshot.upsert({
        where: {
          treasuryAccountId_balanceDate: {
            treasuryAccountId,
            balanceDate,
          },
        },
        create: {
          tenantId: context.tenantId,
          treasuryAccountId,
          balanceDate,
          availableBalance: available,
          ledgerBalance:
            current != null && Number.isFinite(current)
              ? current
              : null,
          sourceReference: `PLAID:${externalId}`,
          recordedByUserId: `integration:${context.connectionId}`,
        },
        update: {
          availableBalance: available,
          ledgerBalance:
            current != null && Number.isFinite(current)
              ? current
              : null,
          sourceReference: `PLAID:${externalId}`,
          recordedByUserId: `integration:${context.connectionId}`,
        },
      });

      written += 1;
    }

    return {
      recordsRead: accounts.length,
      recordsWritten: written,
      recordsSkipped: skipped,
      recordsFailed: failed,
      summary: {
        provider: "PLAID",
        balanceTimestamp: balanceDate.toISOString(),
        stagedAccounts: accounts.length,
        treasurySnapshotsWritten: written,
      },
    };
  },
};
