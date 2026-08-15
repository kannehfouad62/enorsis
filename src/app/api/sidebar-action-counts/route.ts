import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSidebarActionCountsForUser } from "@/modules/navigation/sidebar-action-counts";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id || !session.user.tenantId) {
    return NextResponse.json(
      { counts: {} },
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

  const counts = await getSidebarActionCountsForUser({
    id: session.user.id,
    tenantId: session.user.tenantId,
    roles: session.user.roles,
    commercialPersona:
      tenant?.commercialPersona ?? "BUYER",
  });

  return NextResponse.json(
    { counts },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
