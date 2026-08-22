import { prisma } from "@/lib/prisma";

type JsonObject = Record<string, unknown>;

function objectPayload(value: unknown): JsonObject {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as JsonObject;
  }

  return {};
}

function text(
  payload: JsonObject,
  key: string,
) {
  const value = payload[key];
  return typeof value === "string"
    ? value.trim()
    : "";
}

function numberValue(
  payload: JsonObject,
  key: string,
) {
  const value = payload[key];
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(number)
    ? number
    : null;
}

function dateValue(
  payload: JsonObject,
  key: string,
) {
  const raw = text(payload, key);
  if (!raw) return null;

  const date = new Date(raw);
  return Number.isNaN(date.getTime())
    ? null
    : date;
}

async function processBalanceEvent({
  tenantId,
  integrationId,
  eventId,
  payload,
}: {
  tenantId: string;
  integrationId: string;
  eventId: string;
  payload: JsonObject;
}) {
  const externalAccountId =
    text(payload, "externalAccountId");
  const availableBalance =
    numberValue(payload, "availableBalance");
  const ledgerBalance =
    numberValue(payload, "ledgerBalance");
  const balanceDate =
    dateValue(payload, "balanceDate") ??
    new Date();
  const sourceReference =
    text(payload, "sourceReference") ||
    `integration-event:${eventId}`;

  if (!externalAccountId) {
    throw new Error(
      "treasury.balance requires externalAccountId.",
    );
  }

  if (availableBalance === null) {
    throw new Error(
      "treasury.balance requires a valid availableBalance.",
    );
  }

  const link =
    await prisma.treasuryExternalAccountLink.findFirst({
      where: {
        tenantId,
        integrationId,
        externalAccountId,
        active: true,
      },
    });

  if (!link) {
    throw new Error(
      `No active treasury account mapping exists for external account ${externalAccountId}.`,
    );
  }

  await prisma.treasuryBalanceSnapshot.upsert({
    where: {
      treasuryAccountId_balanceDate: {
        treasuryAccountId:
          link.treasuryAccountId,
        balanceDate,
      },
    },
    create: {
      tenantId,
      treasuryAccountId:
        link.treasuryAccountId,
      balanceDate,
      availableBalance,
      ledgerBalance,
      sourceReference,
      recordedByUserId:
        `integration:${integrationId}`,
    },
    update: {
      availableBalance,
      ledgerBalance,
      sourceReference,
      recordedByUserId:
        `integration:${integrationId}`,
    },
  });

  return `Balance synchronized for external account ${externalAccountId}.`;
}

async function processFxRateEvent({
  tenantId,
  integrationId,
  eventId,
  payload,
}: {
  tenantId: string;
  integrationId: string;
  eventId: string;
  payload: JsonObject;
}) {
  const fromCurrencyCode =
    text(payload, "fromCurrencyCode").toUpperCase();
  const toCurrencyCode =
    text(payload, "toCurrencyCode").toUpperCase();
  const rate =
    numberValue(payload, "rate");
  const effectiveDate =
    dateValue(payload, "effectiveDate") ??
    new Date();
  const sourceReference =
    text(payload, "sourceReference") ||
    `integration-event:${eventId}`;

  if (
    !/^[A-Z]{3}$/.test(fromCurrencyCode) ||
    !/^[A-Z]{3}$/.test(toCurrencyCode)
  ) {
    throw new Error(
      "treasury.fx_rate requires valid fromCurrencyCode and toCurrencyCode.",
    );
  }

  if (rate === null || rate <= 0) {
    throw new Error(
      "treasury.fx_rate requires a positive rate.",
    );
  }

  await prisma.treasuryFxRate.upsert({
    where: {
      tenantId_fromCurrencyCode_toCurrencyCode_effectiveDate: {
        tenantId,
        fromCurrencyCode,
        toCurrencyCode,
        effectiveDate,
      },
    },
    create: {
      tenantId,
      fromCurrencyCode,
      toCurrencyCode,
      rate,
      effectiveDate,
      sourceReference,
      recordedByUserId:
        `integration:${integrationId}`,
    },
    update: {
      rate,
      sourceReference,
      recordedByUserId:
        `integration:${integrationId}`,
    },
  });

  return `FX rate ${fromCurrencyCode}/${toCurrencyCode} synchronized.`;
}

async function processCashFlowEvent({
  tenantId,
  integrationId,
  eventId,
  payload,
}: {
  tenantId: string;
  integrationId: string;
  eventId: string;
  payload: JsonObject;
}) {
  const externalAccountId =
    text(payload, "externalAccountId");
  const type =
    text(payload, "type").toUpperCase();
  const title =
    text(payload, "title");
  const currencyCode =
    text(payload, "currencyCode").toUpperCase();
  const amount =
    numberValue(payload, "amount");
  const expectedDate =
    dateValue(payload, "expectedDate");
  const description =
    text(payload, "description") || null;
  const externalRecordId =
    text(payload, "externalRecordId") ||
    eventId;

  if (
    type !== "INFLOW" &&
    type !== "OUTFLOW"
  ) {
    throw new Error(
      "treasury.cash_flow type must be INFLOW or OUTFLOW.",
    );
  }

  if (!title) {
    throw new Error(
      "treasury.cash_flow requires title.",
    );
  }

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error(
      "treasury.cash_flow requires a valid currencyCode.",
    );
  }

  if (amount === null || amount <= 0) {
    throw new Error(
      "treasury.cash_flow requires a positive amount.",
    );
  }

  if (!expectedDate) {
    throw new Error(
      "treasury.cash_flow requires a valid expectedDate.",
    );
  }

  let treasuryAccountId: string | null = null;

  if (externalAccountId) {
    const link =
      await prisma.treasuryExternalAccountLink.findFirst({
        where: {
          tenantId,
          integrationId,
          externalAccountId,
          active: true,
        },
      });

    if (!link) {
      throw new Error(
        `No active treasury account mapping exists for external account ${externalAccountId}.`,
      );
    }

    treasuryAccountId =
      link.treasuryAccountId;
  }

  const sourceModule =
    `INTEGRATION:${integrationId}`;
  const sourceRecordId =
    externalRecordId;

  const existing =
    await prisma.treasuryCashFlowForecast.findFirst({
      where: {
        tenantId,
        sourceModule,
        sourceRecordId,
      },
    });

  if (existing) {
    await prisma.treasuryCashFlowForecast.update({
      where: {
        id: existing.id,
      },
      data: {
        treasuryAccountId,
        type,
        status: "EXPECTED",
        title,
        description,
        currencyCode,
        amount,
        expectedDate,
      },
    });
  } else {
    await prisma.treasuryCashFlowForecast.create({
      data: {
        tenantId,
        treasuryAccountId,
        type,
        status: "EXPECTED",
        title,
        description,
        currencyCode,
        amount,
        expectedDate,
        sourceModule,
        sourceRecordId,
        createdByUserId:
          `integration:${integrationId}`,
      },
    });
  }

  return `Cash-flow forecast ${externalRecordId} synchronized.`;
}

export async function processTreasuryConnectivityEvents({
  limit = 100,
}: {
  limit?: number;
} = {}) {
  const events =
    await prisma.integrationEvent.findMany({
      where: {
        status: "VALIDATED",
        eventType: {
          in: [
            "treasury.balance",
            "treasury.fx_rate",
            "treasury.cash_flow",
          ],
        },
      },
      orderBy: {
        id: "asc",
      },
      take: limit,
    });

  const results = [];

  for (const event of events) {
    const integration =
      await prisma.integrationConnection.findUnique({
        where: {
          id: event.integrationId,
        },
      });

    if (
      !integration ||
      integration.status !== "ACTIVE" ||
      !integration.inboundEnabled
    ) {
      await prisma.integrationEvent.update({
        where: { id: event.id },
        data: {
          status: "FAILED",
          processedAt: new Date(),
          rejectedReason:
            "Treasury processor requires an active inbound integration.",
        },
      });

      results.push({
        eventId: event.id,
        status: "FAILED" as const,
      });

      continue;
    }

    const existingLog =
      await prisma.treasuryConnectivitySyncLog.findUnique({
        where: {
          integrationEventId: event.id,
        },
      });

    if (existingLog) {
      if (
        event.status !== "PROCESSED"
      ) {
        await prisma.integrationEvent.update({
          where: { id: event.id },
          data: {
            status:
              existingLog.status === "SUCCEEDED"
                ? "PROCESSED"
                : "FAILED",
            processedAt:
              existingLog.processedAt,
            rejectedReason:
              existingLog.status === "FAILED"
                ? existingLog.message
                : null,
          },
        });
      }

      results.push({
        eventId: event.id,
        status: existingLog.status,
        deduplicated: true,
      });

      continue;
    }

    const payload =
      objectPayload(event.payload);

    try {
      let message: string;

      if (event.eventType === "treasury.balance") {
        message =
          await processBalanceEvent({
            tenantId:
              integration.tenantId,
            integrationId:
              integration.id,
            eventId: event.id,
            payload,
          });
      } else if (
        event.eventType === "treasury.fx_rate"
      ) {
        message =
          await processFxRateEvent({
            tenantId:
              integration.tenantId,
            integrationId:
              integration.id,
            eventId: event.id,
            payload,
          });
      } else {
        message =
          await processCashFlowEvent({
            tenantId:
              integration.tenantId,
            integrationId:
              integration.id,
            eventId: event.id,
            payload,
          });
      }

      await prisma.$transaction([
        prisma.treasuryConnectivitySyncLog.create({
          data: {
            tenantId:
              integration.tenantId,
            integrationId:
              integration.id,
            integrationEventId:
              event.id,
            eventType:
              event.eventType,
            status: "SUCCEEDED",
            message,
          },
        }),
        prisma.integrationEvent.update({
          where: { id: event.id },
          data: {
            status: "PROCESSED",
            processedAt:
              new Date(),
            rejectedReason: null,
          },
        }),
        prisma.integrationConnection.update({
          where: {
            id: integration.id,
          },
          data: {
            lastSuccessfulAt:
              new Date(),
          },
        }),
      ]);

      results.push({
        eventId: event.id,
        status: "SUCCEEDED" as const,
        message,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown treasury connectivity failure.";

      await prisma.$transaction([
        prisma.treasuryConnectivitySyncLog.create({
          data: {
            tenantId:
              integration.tenantId,
            integrationId:
              integration.id,
            integrationEventId:
              event.id,
            eventType:
              event.eventType,
            status: "FAILED",
            message,
          },
        }),
        prisma.integrationEvent.update({
          where: { id: event.id },
          data: {
            status: "FAILED",
            processedAt:
              new Date(),
            rejectedReason:
              message,
          },
        }),
      ]);

      results.push({
        eventId: event.id,
        status: "FAILED" as const,
        message,
      });
    }
  }

  return results;
}
