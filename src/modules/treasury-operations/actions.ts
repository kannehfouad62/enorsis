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
