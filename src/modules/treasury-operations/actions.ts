"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const treasuryRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
] as const;

function field(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function treasuryPath(message?: string, error?: string) {
  const params = new URLSearchParams();
  if (message) params.set("message", message);
  if (error) params.set("error", error);
  const query = params.toString();
  return `/app/requisition-to-order/treasury${query ? `?${query}` : ""}`;
}

export async function createTreasuryAccountAction(data: FormData) {
  const user = await requireAnyRole([...treasuryRoles]);

  const name = field(data, "name");
  const institutionName = field(data, "institutionName") || null;
  const accountType = field(data, "accountType") as
    | "OPERATING"
    | "PAYROLL"
    | "TAX"
    | "RESERVE"
    | "INVESTMENT"
    | "OTHER";
  const currencyCode = field(data, "currencyCode").toUpperCase() || "USD";
  const lastFour = field(data, "lastFour") || null;

  let errorMessage: string | null = null;

  try {
    if (name.length < 2) {
      throw new Error("Treasury account name must contain at least 2 characters.");
    }

    if (lastFour && !/^\d{4}$/.test(lastFour)) {
      throw new Error("Last four must contain exactly four digits.");
    }

    await prisma.treasuryAccount.create({
      data: {
        tenantId: user.tenantId,
        name,
        institutionName,
        accountType,
        currencyCode,
        lastFour,
        createdByUserId: user.id,
      },
    });

    revalidatePath("/app/requisition-to-order/treasury");
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "The treasury account could not be created.";
  }

  if (errorMessage) {
    redirect(treasuryPath(undefined, errorMessage));
  }

  redirect(treasuryPath("Treasury account created."));
}

export async function recordTreasuryBalanceAction(data: FormData) {
  const user = await requireAnyRole([...treasuryRoles]);

  const treasuryAccountId = field(data, "treasuryAccountId");
  const balanceDateRaw = field(data, "balanceDate");
  const availableBalanceRaw = field(data, "availableBalance");
  const ledgerBalanceRaw = field(data, "ledgerBalance");
  const sourceReference = field(data, "sourceReference") || null;

  let errorMessage: string | null = null;

  try {
    const account = await prisma.treasuryAccount.findFirst({
      where: {
        id: treasuryAccountId,
        tenantId: user.tenantId,
        active: true,
      },
    });

    if (!account) {
      throw new Error("The selected treasury account is unavailable.");
    }

    const balanceDate = new Date(`${balanceDateRaw}T12:00:00`);
    const availableBalance = Number(availableBalanceRaw);
    const ledgerBalance = ledgerBalanceRaw ? Number(ledgerBalanceRaw) : null;

    if (Number.isNaN(balanceDate.getTime())) {
      throw new Error("The balance date is invalid.");
    }

    if (!Number.isFinite(availableBalance)) {
      throw new Error("Enter a valid available balance.");
    }

    if (ledgerBalance !== null && !Number.isFinite(ledgerBalance)) {
      throw new Error("Enter a valid ledger balance.");
    }

    await prisma.treasuryBalanceSnapshot.upsert({
      where: {
        treasuryAccountId_balanceDate: {
          treasuryAccountId: account.id,
          balanceDate,
        },
      },
      create: {
        tenantId: user.tenantId,
        treasuryAccountId: account.id,
        balanceDate,
        availableBalance,
        ledgerBalance,
        sourceReference,
        recordedByUserId: user.id,
      },
      update: {
        availableBalance,
        ledgerBalance,
        sourceReference,
        recordedByUserId: user.id,
      },
    });

    revalidatePath("/app/requisition-to-order/treasury");
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "The treasury balance could not be recorded.";
  }

  if (errorMessage) {
    redirect(treasuryPath(undefined, errorMessage));
  }

  redirect(treasuryPath("Treasury balance recorded."));
}

export async function createTreasuryCashFlowForecastAction(data: FormData) {
  const user = await requireAnyRole([...treasuryRoles]);

  const treasuryAccountId = field(data, "treasuryAccountId") || null;
  const type = field(data, "type") as "INFLOW" | "OUTFLOW";
  const title = field(data, "title");
  const description = field(data, "description") || null;
  const currencyCode = field(data, "currencyCode").toUpperCase() || "USD";
  const amountRaw = field(data, "amount");
  const expectedDateRaw = field(data, "expectedDate");

  let errorMessage: string | null = null;

  try {
    const amount = Number(amountRaw);
    const expectedDate = new Date(`${expectedDateRaw}T12:00:00`);

    if (title.length < 2) {
      throw new Error("Cash-flow title must contain at least 2 characters.");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Cash-flow amount must be greater than zero.");
    }

    if (Number.isNaN(expectedDate.getTime())) {
      throw new Error("The expected date is invalid.");
    }

    if (treasuryAccountId) {
      const account = await prisma.treasuryAccount.findFirst({
        where: {
          id: treasuryAccountId,
          tenantId: user.tenantId,
          active: true,
        },
      });

      if (!account) {
        throw new Error("The selected treasury account is unavailable.");
      }
    }

    await prisma.treasuryCashFlowForecast.create({
      data: {
        tenantId: user.tenantId,
        treasuryAccountId,
        type,
        title,
        description,
        currencyCode,
        amount,
        expectedDate,
        createdByUserId: user.id,
      },
    });

    revalidatePath("/app/requisition-to-order/treasury");
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "The cash-flow forecast could not be created.";
  }

  if (errorMessage) {
    redirect(treasuryPath(undefined, errorMessage));
  }

  redirect(treasuryPath("Treasury cash-flow forecast created."));
}

export async function syncPaymentRunsToTreasuryForecastAction() {
  const user = await requireAnyRole([...treasuryRoles]);

  let errorMessage: string | null = null;
  let resultMessage: string | null = null;

  try {
    const batches = await prisma.paymentBatch.findMany({
      where: {
        tenantId: user.tenantId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const batchIds = batches.map((batch) => batch.id);

    const items = batchIds.length
      ? await prisma.paymentBatchItem.findMany({
          where: {
            paymentBatchId: {
              in: batchIds,
            },
          },
          select: {
            paymentBatchId: true,
            supplierInvoiceId: true,
          },
        })
      : [];

    const invoiceIds = [
      ...new Set(
        items.map((item) => item.supplierInvoiceId),
      ),
    ];

    const invoices = invoiceIds.length
      ? await prisma.supplierInvoice.findMany({
          where: {
            tenantId: user.tenantId,
            id: {
              in: invoiceIds,
            },
          },
          select: {
            id: true,
            invoiceNumber: true,
            dueDate: true,
          },
        })
      : [];

    const invoiceById = new Map(
      invoices.map((invoice) => [
        invoice.id,
        invoice,
      ]),
    );

    const invoiceIdsByBatch = new Map<
      string,
      string[]
    >();

    for (const item of items) {
      const current =
        invoiceIdsByBatch.get(
          item.paymentBatchId,
        ) ?? [];
      current.push(item.supplierInvoiceId);
      invoiceIdsByBatch.set(
        item.paymentBatchId,
        current,
      );
    }

    let created = 0;
    let updated = 0;
    let retired = 0;

    for (const batch of batches) {
      const sourceModule = "PAYMENT_BATCH";
      const sourceRecordId = batch.id;

      const existing =
        await prisma.treasuryCashFlowForecast.findFirst({
          where: {
            tenantId: user.tenantId,
            sourceModule,
            sourceRecordId,
          },
        });

      const isOpenPayment =
        batch.status === "PENDING_APPROVAL" ||
        batch.status === "APPROVED" ||
        batch.status === "PROCESSING";

      if (!isOpenPayment) {
        if (
          existing &&
          existing.status !== "CANCELLED"
        ) {
          await prisma.treasuryCashFlowForecast.update({
            where: {
              id: existing.id,
            },
            data: {
              status: "CANCELLED",
              description: [
                existing.description,
                `Retired automatically because payment run ${batch.batchNumber} is ${batch.status}.`,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          });
          retired += 1;
        }

        continue;
      }

      const linkedInvoiceIds =
        invoiceIdsByBatch.get(batch.id) ?? [];

      const linkedInvoices =
        linkedInvoiceIds
          .map((id) => invoiceById.get(id))
          .filter(
            (
              invoice,
            ): invoice is NonNullable<
              typeof invoice
            > => Boolean(invoice),
          );

      const dueDates = linkedInvoices
        .map((invoice) => invoice.dueDate)
        .filter(
          (date): date is Date =>
            date instanceof Date,
        )
        .sort(
          (a, b) =>
            a.getTime() - b.getTime(),
        );

      const expectedDate =
        dueDates[0] ??
        new Date(
          batch.createdAt.getTime() +
            3 * 24 * 60 * 60 * 1000,
        );

      const invoiceNumbers =
        linkedInvoices
          .map(
            (invoice) =>
              invoice.invoiceNumber,
          )
          .filter(Boolean);

      const title =
        `Payment run ${batch.batchNumber}`;

      const description = [
        "Automatically sourced from Accounts Payable payment operations.",
        invoiceNumbers.length
          ? `Invoices: ${invoiceNumbers.join(", ")}`
          : null,
        `Payment status: ${batch.status}`,
      ]
        .filter(Boolean)
        .join("\n");

      if (existing) {
        await prisma.treasuryCashFlowForecast.update({
          where: {
            id: existing.id,
          },
          data: {
            type: "OUTFLOW",
            status: "EXPECTED",
            title,
            description,
            currencyCode: batch.currencyCode,
            amount: batch.totalAmount,
            expectedDate,
          },
        });
        updated += 1;
      } else {
        await prisma.treasuryCashFlowForecast.create({
          data: {
            tenantId: user.tenantId,
            treasuryAccountId: null,
            type: "OUTFLOW",
            status: "EXPECTED",
            title,
            description,
            currencyCode: batch.currencyCode,
            amount: batch.totalAmount,
            expectedDate,
            sourceModule,
            sourceRecordId,
            createdByUserId: user.id,
          },
        });
        created += 1;
      }
    }

    revalidatePath(
      "/app/requisition-to-order/treasury",
    );

    resultMessage =
      `Treasury sync complete: ${created} created, ${updated} refreshed, ${retired} retired.`;
  } catch (error) {
    console.error(
      "Payment-to-treasury forecast sync failed",
      {
        tenantId: user.tenantId,
        actorUserId: user.id,
        error,
      },
    );

    errorMessage =
      error instanceof Error
        ? error.message
        : "Payment forecasts could not be synchronized to treasury.";
  }

  if (errorMessage) {
    redirect(
      treasuryPath(undefined, errorMessage),
    );
  }

  redirect(
    treasuryPath(
      resultMessage ??
        "Treasury forecasts synchronized.",
    ),
  );
}

export async function saveTreasuryLiquidityPolicyAction(data: FormData) {
  const user = await requireAnyRole([...treasuryRoles]);

  const minimumCashBuffer = Number(field(data, "minimumCashBuffer"));
  const warningThreshold = Number(field(data, "warningThreshold"));
  const criticalThreshold = Number(field(data, "criticalThreshold"));
  const alertEnabled = field(data, "alertEnabled") === "on";

  let errorMessage: string | null = null;

  try {
    if (
      ![minimumCashBuffer, warningThreshold, criticalThreshold].every(
        Number.isFinite,
      )
    ) {
      throw new Error("Enter valid liquidity threshold amounts.");
    }

    if (
      minimumCashBuffer < 0 ||
      warningThreshold < 0 ||
      criticalThreshold < 0
    ) {
      throw new Error("Liquidity thresholds cannot be negative.");
    }

    if (criticalThreshold > warningThreshold) {
      throw new Error(
        "Critical threshold should be less than or equal to the warning threshold.",
      );
    }

    await prisma.treasuryLiquidityPolicy.upsert({
      where: {
        tenantId: user.tenantId,
      },
      create: {
        tenantId: user.tenantId,
        minimumCashBuffer,
        warningThreshold,
        criticalThreshold,
        alertEnabled,
        updatedByUserId: user.id,
      },
      update: {
        minimumCashBuffer,
        warningThreshold,
        criticalThreshold,
        alertEnabled,
        updatedByUserId: user.id,
      },
    });

    revalidatePath("/app/requisition-to-order/treasury");
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Liquidity policy could not be saved.";
  }

  if (errorMessage) {
    redirect(treasuryPath(undefined, errorMessage));
  }

  redirect(treasuryPath("Liquidity policy saved."));
}

export async function createTreasuryForecastScenarioAction(data: FormData) {
  const user = await requireAnyRole([...treasuryRoles]);

  const name = field(data, "name");
  const inflowMultiplier = Number(field(data, "inflowMultiplier"));
  const outflowMultiplier = Number(field(data, "outflowMultiplier"));

  let errorMessage: string | null = null;

  try {
    if (name.length < 2) {
      throw new Error("Scenario name must contain at least 2 characters.");
    }

    if (
      !Number.isFinite(inflowMultiplier) ||
      !Number.isFinite(outflowMultiplier) ||
      inflowMultiplier < 0 ||
      outflowMultiplier < 0 ||
      inflowMultiplier > 5 ||
      outflowMultiplier > 5
    ) {
      throw new Error("Scenario multipliers must be between 0 and 5.");
    }

    await prisma.treasuryForecastScenario.create({
      data: {
        tenantId: user.tenantId,
        name,
        inflowMultiplier,
        outflowMultiplier,
        createdByUserId: user.id,
      },
    });

    revalidatePath("/app/requisition-to-order/treasury");
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Treasury forecast scenario could not be created.";
  }

  if (errorMessage) {
    redirect(treasuryPath(undefined, errorMessage));
  }

  redirect(treasuryPath("Treasury forecast scenario created."));
}
