import {
  NextResponse,
} from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getBuyerCommandCenterData,
} from "@/modules/command-center/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user?.tenantId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: {
      id: session.user.tenantId,
    },
    select: {
      commercialPersona: true,
    },
  });

  if (!tenant) {
    return NextResponse.json(
      { error: "Tenant not found" },
      { status: 404 },
    );
  }

  const data =
    await getBuyerCommandCenterData({
      id: session.user.id,
      tenantId: session.user.tenantId,
      name: session.user.name,
      email: session.user.email,
      roles: session.user.roles,
      commercialPersona:
        tenant.commercialPersona,
    });

  return NextResponse.json(data, {
    headers: {
      "Cache-Control":
        "no-store, no-cache, must-revalidate",
    },
  });
}