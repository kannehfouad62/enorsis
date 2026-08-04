import { withApiGateway } from "@/core/api-gateway/handler";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  return withApiGateway({
    request,
    scope: "sourcing:read",
    handler: async (identity) => {
      const events = await prisma.sourcingEvent.findMany({
        where: { tenantId: identity.tenantId },
        include: {
          rounds: {
            orderBy: { roundNumber: "asc" },
          },
          invitations: true,
          award: true,
        },
        orderBy: { createdAt: "desc" },
        take: 250,
      });

      return {
        data: events.map((event) => ({
          id: event.id,
          eventNumber: event.eventNumber,
          title: event.title,
          type: event.type,
          status: event.status,
          currencyCode: event.currencyCode,
          estimatedValue: event.estimatedValue?.toString() ?? null,
          responseDeadline: event.responseDeadline,
          roundCount: event.rounds.length,
          invitationCount: event.invitations.length,
          awardCount: event.award ? 1 : 0,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        })),
      };
    },
  });
}
