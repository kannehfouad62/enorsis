"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyRole } from "@/core/auth/authorization";
import { createEnterpriseNotification } from "@/core/notifications";
import { prisma } from "@/lib/prisma";
import { getTreasuryExecutiveReport } from "./queries";

const certifierRoles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "FINANCE",
  "PROCUREMENT_EXECUTIVE",
] as const;

function field(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function reportPath(message?: string, error?: string) {
  const params = new URLSearchParams();
  if (message) params.set("message", message);
  if (error) params.set("error", error);
  const query = params.toString();

  return `/app/requisition-to-order/treasury/executive${
    query ? `?${query}` : ""
  }`;
}

export async function certifyTreasuryCloseAction(data: FormData) {
  const user = await requireAnyRole([...certifierRoles]);

  const periodStartRaw = field(data, "periodStart");
  const periodEndRaw = field(data, "periodEnd");
  const attestationNote = field(data, "attestationNote");

  let errorMessage: string | null = null;

  try {
    const periodStart = new Date(`${periodStartRaw}T00:00:00`);
    const periodEnd = new Date(`${periodEndRaw}T23:59:59`);

    if (
      Number.isNaN(periodStart.getTime()) ||
      Number.isNaN(periodEnd.getTime()) ||
      periodStart > periodEnd
    ) {
      throw new Error("Enter a valid certification period.");
    }

    if (attestationNote.length < 20) {
      throw new Error(
        "Provide an attestation note of at least 20 characters.",
      );
    }

    const report = await getTreasuryExecutiveReport();

    if (!report.summary.readiness) {
      throw new Error(
        "Treasury close certification is blocked until all critical liquidity, connectivity, reconciliation, approval, and FX-rate issues are cleared.",
      );
    }

    await prisma.treasuryCloseCertification.upsert({
      where: {
        tenantId_periodStart_periodEnd: {
          tenantId: user.tenantId,
          periodStart,
          periodEnd,
        },
      },
      create: {
        tenantId: user.tenantId,
        periodStart,
        periodEnd,
        baseCurrencyCode: report.baseCurrencyCode,
        availableCash: report.summary.availableCash,
        projected30DayCash:
          report.summary.projected30DayCash,
        criticalLiquidityAlerts:
          report.summary.criticalLiquidityAlerts,
        criticalConnectivityIncidents:
          report.summary.criticalConnectivityIncidents,
        materialReconciliationBlockers:
          report.summary.materialReconciliationBlockers,
        pendingReconciliationApprovals:
          report.summary.pendingReconciliationApprovals,
        missingFxRateCount:
          report.summary.missingFxRateCount,
        attestationNote,
        certifiedByUserId: user.id,
      },
      update: {
        status: "CERTIFIED",
        baseCurrencyCode: report.baseCurrencyCode,
        availableCash: report.summary.availableCash,
        projected30DayCash:
          report.summary.projected30DayCash,
        criticalLiquidityAlerts:
          report.summary.criticalLiquidityAlerts,
        criticalConnectivityIncidents:
          report.summary.criticalConnectivityIncidents,
        materialReconciliationBlockers:
          report.summary.materialReconciliationBlockers,
        pendingReconciliationApprovals:
          report.summary.pendingReconciliationApprovals,
        missingFxRateCount:
          report.summary.missingFxRateCount,
        attestationNote,
        certifiedByUserId: user.id,
        certifiedAt: new Date(),
        revokedAt: null,
      },
    });

    const leadership = await prisma.membership.findMany({
      where: {
        tenantId: user.tenantId,
        status: "ACTIVE",
        roles: {
          hasSome: [
            "TENANT_OWNER",
            "TENANT_ADMIN",
            "FINANCE",
            "PROCUREMENT_EXECUTIVE",
          ] as never[],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    await Promise.allSettled(
      leadership
        .filter((member) => member.user.id !== user.id)
        .map((member) =>
          createEnterpriseNotification({
            tenantId: user.tenantId,
            eventType: "Treasury.CloseCertified",
            recipientUserId: member.user.id,
            recipientAddress: member.user.email,
            title: "Treasury close certified",
            message:
              `Treasury close for ${periodStart.toLocaleDateString()} through ${periodEnd.toLocaleDateString()} was certified with no blocking controls.`,
            actionUrl:
              "/app/requisition-to-order/treasury/executive",
            priority: "NORMAL",
            channels: member.user.email
              ? ["IN_APP", "EMAIL"]
              : ["IN_APP"],
            data: {
              periodStart: periodStart.toISOString(),
              periodEnd: periodEnd.toISOString(),
            },
          }),
        ),
    );

    revalidatePath(
      "/app/requisition-to-order/treasury/executive",
    );
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Treasury close certification could not be recorded.";
  }

  if (errorMessage) {
    redirect(reportPath(undefined, errorMessage));
  }

  redirect(reportPath("Treasury close certification recorded."));
}
