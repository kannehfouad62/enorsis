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

function connectivityPath(
  message?: string,
  error?: string,
) {
  const params = new URLSearchParams();
  if (message) params.set("message", message);
  if (error) params.set("error", error);

  const query = params.toString();

  return `/app/requisition-to-order/treasury/connectivity${
    query ? `?${query}` : ""
  }`;
}

export async function createTreasuryExternalAccountLinkAction(
  data: FormData,
) {
  const user =
    await requireAnyRole([...treasuryRoles]);

  const integrationId =
    field(data, "integrationId");
  const treasuryAccountId =
    field(data, "treasuryAccountId");
  const externalAccountId =
    field(data, "externalAccountId");
  const externalAccountName =
    field(data, "externalAccountName") ||
    null;

  let errorMessage: string | null = null;

  try {
    if (!externalAccountId) {
      throw new Error(
        "External account ID is required.",
      );
    }

    const [integration, account] =
      await Promise.all([
        prisma.integrationConnection.findFirst({
          where: {
            id: integrationId,
            tenantId: user.tenantId,
            status: "ACTIVE",
            inboundEnabled: true,
          },
        }),
        prisma.treasuryAccount.findFirst({
          where: {
            id: treasuryAccountId,
            tenantId: user.tenantId,
            active: true,
          },
        }),
      ]);

    if (!integration) {
      throw new Error(
        "Select an active inbound integration connection.",
      );
    }

    if (!account) {
      throw new Error(
        "Select an active treasury account.",
      );
    }

    await prisma.treasuryExternalAccountLink.upsert({
      where: {
        integrationId_externalAccountId: {
          integrationId,
          externalAccountId,
        },
      },
      create: {
        tenantId: user.tenantId,
        integrationId,
        treasuryAccountId,
        externalAccountId,
        externalAccountName,
        createdByUserId: user.id,
      },
      update: {
        treasuryAccountId,
        externalAccountName,
        active: true,
      },
    });

    revalidatePath(
      "/app/requisition-to-order/treasury/connectivity",
    );
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "External treasury account mapping could not be saved.";
  }

  if (errorMessage) {
    redirect(
      connectivityPath(
        undefined,
        errorMessage,
      ),
    );
  }

  redirect(
    connectivityPath(
      "External treasury account mapping saved.",
    ),
  );
}
