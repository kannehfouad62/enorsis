import { auth } from "@/auth";
import { getRtoAuditEvidence } from "@/modules/requisition-to-order/rto-audit-evidence-queries";

function csvCell(value: unknown) {
  const text =
    value === null || value === undefined
      ? ""
      : String(value);

  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const format =
    url.searchParams.get("format")?.toLowerCase() ??
    "json";

  const data = await getRtoAuditEvidence();

  if (format === "csv") {
    const header = [
      "journeyNumber",
      "title",
      "status",
      "correlationId",
      "approvalDecisions",
      "pendingApprovals",
      "exceptions",
      "milestones",
      "purchaseOrders",
      "receipts",
      "threeWayMatches",
      "paymentReadinessCases",
      "escalations",
      "activities",
      "createdAt",
      "updatedAt",
    ];

    const rows = data.journeys.map((journey) => [
      journey.journeyNumber,
      journey.title,
      journey.status,
      journey.correlationId ?? "",
      journey.approvals.decisions,
      journey.approvals.pending,
      journey.exceptions.length,
      journey.milestones.length,
      journey.downstream.purchaseOrders,
      journey.downstream.receipts,
      journey.downstream.threeWayMatches,
      journey.downstream.paymentReadinessCases,
      journey.escalations.length,
      journey.activities.length,
      journey.createdAt.toISOString(),
      journey.updatedAt.toISOString(),
    ]);

    const csv = [
      header.map(csvCell).join(","),
      ...rows.map((row) =>
        row.map(csvCell).join(","),
      ),
    ].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type":
          "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="enorsis-rto-audit-evidence.csv"',
      },
    });
  }

  return new Response(
    JSON.stringify(data, null, 2),
    {
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="enorsis-rto-audit-evidence.json"',
      },
    },
  );
}
