import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const tenantId = session.user.tenantId;

  const traces =
    await prisma.closedLoopRuntimePolicyDecisionTrace.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

  return NextResponse.json({
    traces,
  });
}
