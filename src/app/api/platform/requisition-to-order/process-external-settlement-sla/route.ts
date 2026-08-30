import {
  processExternalSettlementConfirmationSla,
} from "@/modules/payment-operations/external-settlement-sla";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return false;
  }

  return (
    request.headers.get("authorization") ===
    `Bearer ${secret}`
  );
}

async function handler(request: Request) {
  if (!authorized(request)) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const result =
    await processExternalSettlementConfirmationSla();

  return Response.json(result);
}

export async function GET(request: Request) {
  return handler(request);
}

export async function POST(request: Request) {
  return handler(request);
}
