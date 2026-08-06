import { NextResponse } from "next/server";
import { runPlatformCertification } from "@/core/readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret &&
      request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    releaseVersion?: string;
    environment?: string;
  };

  const result = await runPlatformCertification({
    name: "Automated Platform Certification",
    releaseVersion: body.releaseVersion ?? null,
    environment: body.environment ?? process.env.VERCEL_ENV ?? "PRODUCTION",
  });

  return NextResponse.json(result);
}
