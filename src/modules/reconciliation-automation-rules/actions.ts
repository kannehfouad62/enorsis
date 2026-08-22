"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const ruleRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
] as const;

function field(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function rulesPath(message?: string, error?: string) {
  const params = new URLSearchParams();
  if (message) params.set("message", message);
  if (error) params.set("error", error);
  const query = params.toString();
  return `/app/requisition-to-order/reconciliation/rules${
    query ? `?${query}` : ""
  }`;
}

export async function createBankReconciliationAutomationRuleAction(
  data: FormData,
) {
  const user = await requireAnyRole([...ruleRoles]);

  const name = field(data, "name");
  const description = field(data, "description") || null;
  const toleranceRaw = field(data, "amountTolerance");
  const maxDateVarianceDaysRaw = field(
    data,
    "maxDateVarianceDays",
  );
  const requireCurrencyMatch =
    field(data, "requireCurrencyMatch") === "on";
  const allowPartialMatch =
    field(data, "allowPartialMatch") === "on";

  let errorMessage: string | null = null;

  try {
    const amountTolerance = Number(toleranceRaw);
    const maxDateVarianceDays = Number(
      maxDateVarianceDaysRaw,
    );

    if (name.length < 2) {
      throw new Error(
        "Automation rule name must contain at least 2 characters.",
      );
    }

    if (
      !Number.isFinite(amountTolerance) ||
      amountTolerance < 0 ||
      amountTolerance > 1000
    ) {
      throw new Error(
        "Amount tolerance must be between 0 and 1,000.",
      );
    }

    if (
      !Number.isInteger(maxDateVarianceDays) ||
      maxDateVarianceDays < 0 ||
      maxDateVarianceDays > 365
    ) {
      throw new Error(
        "Date variance window must be between 0 and 365 days.",
      );
    }

    const existing =
      await prisma.bankReconciliationAutomationRule.findFirst({
        where: {
          tenantId: user.tenantId,
          name,
        },
      });

    if (existing) {
      throw new Error(
        "An automation rule with this name already exists.",
      );
    }

    await prisma.bankReconciliationAutomationRule.create({
      data: {
        tenantId: user.tenantId,
        name,
        description,
        amountTolerance,
        requireCurrencyMatch,
        maxDateVarianceDays,
        allowPartialMatch,
        createdByUserId: user.id,
      },
    });

    revalidatePath(
      "/app/requisition-to-order/reconciliation",
    );
    revalidatePath(
      "/app/requisition-to-order/reconciliation/rules",
    );
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "The reconciliation automation rule could not be created.";
  }

  if (errorMessage) {
    redirect(rulesPath(undefined, errorMessage));
  }

  redirect(
    rulesPath("Reconciliation automation rule created."),
  );
}

export async function setBankReconciliationAutomationRuleActiveAction(
  data: FormData,
) {
  const user = await requireAnyRole([...ruleRoles]);
  const ruleId = field(data, "ruleId");
  const active = field(data, "active") === "true";

  let errorMessage: string | null = null;

  try {
    const updated =
      await prisma.bankReconciliationAutomationRule.updateMany({
        where: {
          id: ruleId,
          tenantId: user.tenantId,
        },
        data: {
          active,
        },
      });

    if (updated.count !== 1) {
      throw new Error(
        "The automation rule is not available to your organization.",
      );
    }

    revalidatePath(
      "/app/requisition-to-order/reconciliation",
    );
    revalidatePath(
      "/app/requisition-to-order/reconciliation/rules",
    );
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "The reconciliation automation rule could not be updated.";
  }

  if (errorMessage) {
    redirect(rulesPath(undefined, errorMessage));
  }

  redirect(
    rulesPath(
      active
        ? "Automation rule activated."
        : "Automation rule deactivated.",
    ),
  );
}
