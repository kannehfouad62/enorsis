import { prisma } from "@/lib/prisma";

export async function buildSupplierAiContext(
  tenantId: string,
  supplierId: string,
) {
  const supplier = await prisma.supplier.findFirstOrThrow({
    where: { id: supplierId, tenantId },
    include: {
      contacts: true,
      documents: true,
      contracts: {
        select: {
          contractNumber: true,
          title: true,
          status: true,
          riskLevel: true,
          totalValue: true,
          currencyCode: true,
          endDate: true,
        },
      },
      sourcingResponses: {
        select: {
          status: true,
          currencyCode: true,
          totalBid: true,
          deliveryDays: true,
          submittedAt: true,
          event: {
            select: {
              eventNumber: true,
              type: true,
              title: true,
              status: true,
            },
          },
        },
      },
    },
  });

  return JSON.stringify(
    {
      supplier: {
        supplierNumber: supplier.supplierNumber,
        legalName: supplier.legalName,
        tradingName: supplier.tradingName,
        countryCode: supplier.countryCode,
        categories: supplier.categories,
        status: supplier.status,
        riskTier: supplier.riskTier,
        qualificationStatus: supplier.qualificationStatus,
        diversityOwned: supplier.diversityOwned,
        esgCommitted: supplier.esgCommitted,
        sanctionsScreenedAt: supplier.sanctionsScreenedAt,
      },
      contacts: supplier.contacts.map((contact) => ({
        name: contact.name,
        title: contact.title,
        isPrimary: contact.isPrimary,
      })),
      documents: supplier.documents.map((document) => ({
        type: document.type,
        status: document.status,
        name: document.name,
        issuedAt: document.issuedAt,
        expiresAt: document.expiresAt,
        verifiedAt: document.verifiedAt,
      })),
      contracts: supplier.contracts,
      sourcingHistory: supplier.sourcingResponses,
    },
    null,
    2,
  );
}

export async function buildSourcingAiContext(
  tenantId: string,
  sourcingEventId: string,
) {
  const event = await prisma.sourcingEvent.findFirstOrThrow({
    where: { id: sourcingEventId, tenantId },
    include: {
      criteria: { orderBy: { sequence: "asc" } },
      invitations: {
        include: {
          supplier: {
            select: {
              supplierNumber: true,
              legalName: true,
              tradingName: true,
              riskTier: true,
              qualificationStatus: true,
            },
          },
        },
      },
      responses: {
        include: {
          supplier: {
            select: {
              supplierNumber: true,
              legalName: true,
              tradingName: true,
              riskTier: true,
              qualificationStatus: true,
            },
          },
          scores: {
            include: {
              criterion: {
                select: {
                  name: true,
                  type: true,
                  weight: true,
                },
              },
            },
          },
        },
      },
      award: true,
      rounds: true,
      questions: true,
    },
  });

  return JSON.stringify(
    {
      event: {
        eventNumber: event.eventNumber,
        type: event.type,
        status: event.status,
        title: event.title,
        summary: event.summary,
        scopeOfWork: event.scopeOfWork,
        currencyCode: event.currencyCode,
        estimatedValue: event.estimatedValue,
        responseDeadline: event.responseDeadline,
        sealedResponses: event.sealedResponses,
        allowMultipleRounds: event.allowMultipleRounds,
        currentRound: event.currentRound,
      },
      criteria: event.criteria,
      invitations: event.invitations,
      responses: event.responses,
      award: event.award,
      rounds: event.rounds,
      clarifications: event.questions,
    },
    null,
    2,
  );
}

export async function buildContractAiContext(
  tenantId: string,
  contractId: string,
) {
  const contract = await prisma.contract.findFirstOrThrow({
    where: { id: contractId, tenantId },
    include: {
      supplier: {
        select: {
          supplierNumber: true,
          legalName: true,
          tradingName: true,
          riskTier: true,
          qualificationStatus: true,
        },
      },
      clauses: { orderBy: { sequence: "asc" } },
      approvals: { orderBy: { sequence: "asc" } },
      obligations: { orderBy: { dueDate: "asc" } },
      riskReviews: { orderBy: { reviewedAt: "desc" } },
      contractAmendments: {
        orderBy: { amendmentNumber: "asc" },
      },
      documents: {
        select: {
          type: true,
          name: true,
          createdAt: true,
        },
      },
    },
  });

  return JSON.stringify(
    {
      contract: {
        contractNumber: contract.contractNumber,
        title: contract.title,
        type: contract.type,
        status: contract.status,
        riskLevel: contract.riskLevel,
        currencyCode: contract.currencyCode,
        totalValue: contract.totalValue,
        startDate: contract.startDate,
        endDate: contract.endDate,
        autoRenew: contract.autoRenew,
        renewalNoticeDays: contract.renewalNoticeDays,
        governingLaw: contract.governingLaw,
        summary: contract.summary,
      },
      supplier: contract.supplier,
      clauses: contract.clauses,
      approvals: contract.approvals,
      obligations: contract.obligations,
      riskReviews: contract.riskReviews,
      amendments: contract.contractAmendments,
      documents: contract.documents,
    },
    null,
    2,
  );
}
