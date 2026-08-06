"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  certifyProcurementProcess,
  runProcurementProcessCertification,
} from "@/core/requisition-to-order/certification";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function runProcurementProcessCertificationAction(data: FormData) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PROCUREMENT_EXECUTIVE",
    "PROCUREMENT_MANAGER",
    "FINANCE",
    "ACCOUNTS_PAYABLE",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_AUDITOR",
  ]);

  await runProcurementProcessCertification({
    journeyId: field(data, "journeyId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/requisition-to-order/certification");
}

export async function certifyProcurementProcessAction(data: FormData) {
  const user = await requireAnyRole([
    "TENANT_OWNER",
    "TENANT_ADMIN",
    "PROCUREMENT_EXECUTIVE",
    "FINANCE",
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_AUDITOR",
  ]);

  await certifyProcurementProcess({
    certificationId: field(data, "certificationId"),
    actorUserId: user.id,
  });

  revalidatePath("/app/requisition-to-order/certification");
}
