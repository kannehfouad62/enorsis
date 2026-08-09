"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { createNativeStrategicSourcingDraft } from "@/core/autonomous-procurement/native-strategic-sourcing-adapter";
import { prisma } from "@/lib/prisma";

const roles = [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "BUYER",
] as const;

const field = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();

export async function createNativeStrategicSourcingDraftAction(
  data: FormData,
) {
  const user = await requireAnyRole([...roles]);

  const event = await createNativeStrategicSourcingDraft({
    tenantId: user.tenantId,
    userId: user.id,
    nativeDraftId: field(data, "nativeDraftId"),
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel:
        user.email ?? "Autonomous sourcing operator",
      action:
        "autonomous_execution.native_sourcing.create_draft",
      resourceType: "SourcingEvent",
      resourceId: event.id,
      after: {
        eventNumber: event.eventNumber,
        type: event.type,
        status: event.status,
        estimatedValue:
          event.estimatedValue === null
            ? null
            : Number(event.estimatedValue),
        autonomousPublicationPerformed: false,
        autonomousAwardPerformed: false,
      },
    },
  });

  revalidatePath(
    "/app/governance/autonomous-execution/native-drafts/sourcing",
  );
  revalidatePath("/app/sourcing");
  revalidatePath(`/app/sourcing/${event.id}`);
}
