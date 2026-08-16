"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import {
  certifyPlatformRelease,
  runPlatformCertification,
} from "@/core/readiness";

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function runPlatformCertificationAction(data: FormData) {
  const user = await requireAnyRole([
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_SUPPORT",
    "PLATFORM_AUDITOR",
  ]);

  await runPlatformCertification({
    tenantId: null,
    name: field(data, "name") || "Platform Readiness Certification",
    releaseVersion: field(data, "releaseVersion") || null,
    environment: field(data, "environment") || undefined,
    userId: user.id,
  });

  revalidatePath("/app/settings/platform-readiness");
}

export async function certifyPlatformReleaseAction(data: FormData) {
  const user = await requireAnyRole([
    "PLATFORM_SUPER_ADMIN",
    "PLATFORM_AUDITOR",
  ]);

  await certifyPlatformRelease({
    certificationRunId: field(data, "certificationRunId"),
    userId: user.id,
  });

  revalidatePath("/app/settings/platform-readiness");
}
