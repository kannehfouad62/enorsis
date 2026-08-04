import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sanitizeHeaders,
  verifyWebhookSecret,
} from "@/core/integrations/security";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const integration = await prisma.integrationConnection.findFirst({
    where: {
      key,
      status: "ACTIVE",
      inboundEnabled: true,
    },
  });

  if (!integration) {
    return new NextResponse("Integration not found", { status: 404 });
  }

  const suppliedSecret = request.headers.get("x-enorsis-webhook-secret");
  const signatureValid = verifyWebhookSecret(
    suppliedSecret,
    integration.webhookSecretHash,
  );

  const payload = await request.json().catch(() => null);
  const eventType =
    request.headers.get("x-event-type") ||
    (payload && typeof payload === "object" && "type" in payload
      ? String(payload.type)
      : "unknown");
  const externalEventId =
    request.headers.get("x-event-id") ||
    (payload && typeof payload === "object" && "id" in payload
      ? String(payload.id)
      : null);

  if (!signatureValid) {
    await prisma.integrationEvent.create({
      data: {
        integrationId: integration.id,
        externalEventId,
        eventType,
        status: "REJECTED",
        headers: sanitizeHeaders(request.headers),
        payload: payload ?? {},
        signatureValid: false,
        rejectedReason: "Invalid webhook secret.",
        correlationId: request.headers.get("x-correlation-id"),
      },
    });

    return new NextResponse("Invalid signature", { status: 401 });
  }

  const event = await prisma.integrationEvent.create({
    data: {
      integrationId: integration.id,
      externalEventId,
      eventType,
      status: "VALIDATED",
      headers: sanitizeHeaders(request.headers),
      payload: payload ?? {},
      signatureValid: true,
      correlationId: request.headers.get("x-correlation-id"),
    },
  });

  return NextResponse.json(
    {
      accepted: true,
      eventId: event.id,
      status: event.status,
    },
    { status: 202 },
  );
}
