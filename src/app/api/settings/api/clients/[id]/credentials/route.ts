import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { issueApiKey } from "@/core/api-gateway/crypto";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (
    !session?.user ||
    !session.user.roles.some((role) =>
      ["TENANT_ADMIN", "TENANT_OWNER"].includes(role),
    )
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    expiresAt?: string | null;
  } | null;

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "Credential name is required." },
      { status: 400 },
    );
  }

  const client = await prisma.apiClient.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
      status: "ACTIVE",
    },
  });

  if (!client) {
    return NextResponse.json(
      { error: "Active API client not found." },
      { status: 404 },
    );
  }

  const issued = issueApiKey();

  await prisma.apiCredential.create({
    data: {
      apiClientId: client.id,
      name,
      prefix: issued.prefix,
      secretHash: issued.hash,
      expiresAt: body?.expiresAt ? new Date(body.expiresAt) : null,
      createdByUserId: session.user.id,
    },
  });

  return NextResponse.json(
    { plaintext: issued.plaintext },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
