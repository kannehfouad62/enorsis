"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";

const mappingRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FINANCE",
  "ACCOUNTS_PAYABLE",
] as const;

function field(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function mappingPath(message?: string, error?: string) {
  const params = new URLSearchParams();
  if (message) params.set("message", message);
  if (error) params.set("error", error);
  const query = params.toString();
  return `/app/requisition-to-order/reconciliation/mappings${
    query ? `?${query}` : ""
  }`;
}

export async function createBankStatementMappingProfileAction(
  data: FormData,
) {
  const user = await requireAnyRole([...mappingRoles]);

  const name = field(data, "name");
  const providerName = field(data, "providerName") || null;
  const referenceColumn = field(data, "referenceColumn");
  const amountColumn = field(data, "amountColumn");
  const dateColumn = field(data, "dateColumn") || null;
  const currencyColumn =
    field(data, "currencyColumn") || null;
  const descriptionColumn =
    field(data, "descriptionColumn") || null;

  let errorMessage: string | null = null;

  try {
    if (
      name.length < 2 ||
      referenceColumn.length < 1 ||
      amountColumn.length < 1
    ) {
      throw new Error(
        "Profile name, reference column, and amount column are required.",
      );
    }

    const existing =
      await prisma.bankStatementMappingProfile.findFirst({
        where: {
          tenantId: user.tenantId,
          name,
        },
      });

    if (existing) {
      throw new Error(
        "A bank statement mapping profile with this name already exists.",
      );
    }

    await prisma.bankStatementMappingProfile.create({
      data: {
        tenantId: user.tenantId,
        name,
        providerName,
        referenceColumn,
        amountColumn,
        dateColumn,
        currencyColumn,
        descriptionColumn,
        createdByUserId: user.id,
      },
    });

    revalidatePath(
      "/app/requisition-to-order/reconciliation",
    );
    revalidatePath(
      "/app/requisition-to-order/reconciliation/mappings",
    );
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "The mapping profile could not be created.";
  }

  if (errorMessage) {
    redirect(mappingPath(undefined, errorMessage));
  }

  redirect(
    mappingPath("Bank statement mapping profile created."),
  );
}

export async function setBankStatementMappingProfileActiveAction(
  data: FormData,
) {
  const user = await requireAnyRole([...mappingRoles]);

  const profileId = field(data, "profileId");
  const active = field(data, "active") === "true";

  let errorMessage: string | null = null;

  try {
    const updated =
      await prisma.bankStatementMappingProfile.updateMany({
        where: {
          id: profileId,
          tenantId: user.tenantId,
        },
        data: {
          active,
        },
      });

    if (updated.count !== 1) {
      throw new Error(
        "The mapping profile is not available to your organization.",
      );
    }

    revalidatePath(
      "/app/requisition-to-order/reconciliation",
    );
    revalidatePath(
      "/app/requisition-to-order/reconciliation/mappings",
    );
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "The mapping profile could not be updated.";
  }

  if (errorMessage) {
    redirect(mappingPath(undefined, errorMessage));
  }

  redirect(
    mappingPath(
      active
        ? "Mapping profile activated."
        : "Mapping profile deactivated.",
    ),
  );
}
