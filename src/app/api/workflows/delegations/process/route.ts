import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  applyActiveWorkflowDelegations,
  expireWorkflowDelegations,
} from "@/modules/workflows/delegation";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret &&
      request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  const results = [];

  for (const tenant of tenants) {
    const [applied, expired] = await Promise.all([
      applyActiveWorkflowDelegations(tenant.id),
      expireWorkflowDelegations(tenant.id),
    ]);

    results.push({
      tenantId: tenant.id,
      ...applied,
      ...expired,
    });
  }

  return NextResponse.json({ tenants: results });
}

export async function POST(request: Request) {
  return GET(request);
}
