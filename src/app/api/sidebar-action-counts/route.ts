import { NextResponse } from "next/server";

import { auth } from "@/auth";
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

  const counts = await getSidebarActionCountsForUser({
    id: session.user.id,
    tenantId: session.user.tenantId,
    roles: session.user.roles,
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
