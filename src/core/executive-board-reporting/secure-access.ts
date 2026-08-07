import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { recordBoardDeliveryAccess } from "./distribution";

export function hashBoardAccessToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createBoardAccessToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function validateBoardDeliveryAccess(input: {
  deliveryId: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  recordOpen?: boolean;
}) {
  const delivery = await prisma.executiveBoardDelivery.findUnique({
    where: { id: input.deliveryId },
    include: {
      recipient: true,
      distribution: {
        include: {
          boardPack: {
            include: {
              definition: true,
            },
          },
          recipientGroup: true,
        },
      },
    },
  });

  if (!delivery) {
    throw new Error("Board delivery was not found.");
  }

  if (delivery.status === "REVOKED") {
    throw new Error("Board delivery access has been revoked.");
  }

  if (
    delivery.accessExpiresAt &&
    delivery.accessExpiresAt.getTime() < Date.now()
  ) {
    throw new Error("Board delivery access link has expired.");
  }

  const suppliedHash = hashBoardAccessToken(input.token);
  const expected = Buffer.from(delivery.accessTokenHash, "hex");
  const supplied = Buffer.from(suppliedHash, "hex");

  if (
    expected.length !== supplied.length ||
    !crypto.timingSafeEqual(expected, supplied)
  ) {
    throw new Error("Board delivery access token is invalid.");
  }

  if (input.recordOpen) {
    await prisma.executiveBoardDelivery.update({
      where: { id: delivery.id },
      data: {
        lastAccessAt: new Date(),
      },
    });

    await recordBoardDeliveryAccess({
      tenantId: delivery.tenantId,
      deliveryId: delivery.id,
      eventType: "OPENED",
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  }

  return delivery;
}
