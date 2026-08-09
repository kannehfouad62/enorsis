import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runEnterprisePerformanceCertification } from "@/core/performance-certification/enterprise-performance-certification";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const run =
    await runEnterprisePerformanceCertification({
      tenantId:
        session.user.tenantId,
      userId:
        session.user.id,
    });

  return NextResponse.json(run);
}
