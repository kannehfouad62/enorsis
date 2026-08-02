"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/core/auth/authorization";
import { prisma } from "@/lib/prisma";
import {
  buildAwardRecommendation,
  calculateWeightedScore,
} from "./evaluation";

const value = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "");

export async function scoreSourcingResponseAction(formData: FormData) {
  const user = await requireAnyRole([
    "BUYER",
    "PROCUREMENT_MANAGER",
    "PROCUREMENT_EXECUTIVE",
    "RISK_COMPLIANCE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const responseId = value(formData, "responseId");
  const response = await prisma.sourcingResponse.findFirstOrThrow({
    where: {
      id: responseId,
      event: { tenantId: user.tenantId },
    },
    include: {
      event: { include: { criteria: { orderBy: { sequence: "asc" } } } },
    },
  });

  const scoreInputs = response.event.criteria.map((criterion) => ({
    criterionId: criterion.id,
    score: Number(value(formData, `score_${criterion.id}`)),
    rationale: value(formData, `rationale_${criterion.id}`),
  }));

  for (const input of scoreInputs) {
    if (!Number.isFinite(input.score) || input.score < 0 || input.score > 100) {
      throw new Error("Evaluation scores must be between 0 and 100.");
    }
  }

  const calculated = calculateWeightedScore(
    response.event.criteria,
    scoreInputs,
  );

  await prisma.$transaction(
    calculated.results.map((result) =>
      prisma.sourcingScore.upsert({
        where: {
          responseId_criterionId: {
            responseId: response.id,
            criterionId: result.criterionId,
          },
        },
        update: {
          score: result.score,
          weightedScore: result.weightedScore,
          evaluatorId: user.id,
          rationale: result.rationale,
        },
        create: {
          responseId: response.id,
          criterionId: result.criterionId,
          score: result.score,
          weightedScore: result.weightedScore,
          evaluatorId: user.id,
          rationale: result.rationale,
        },
      }),
    ),
  );

  await prisma.sourcingEvent.update({
    where: { id: response.sourcingEventId },
    data: { status: "EVALUATION" },
  });

  await prisma.auditEvent.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      actorLabel: user.email,
      action: "sourcing_response.score",
      resourceType: "SourcingResponse",
      resourceId: response.id,
      after: { weightedScore: calculated.total },
    },
  });

  revalidatePath(`/app/sourcing/${response.sourcingEventId}/evaluation`);
}

export async function recommendSourcingAwardAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_MANAGER",
    "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const eventId = value(formData, "sourcingEventId");
  const event = await prisma.sourcingEvent.findFirstOrThrow({
    where: { id: eventId, tenantId: user.tenantId },
    include: {
      responses: {
        where: { status: "SUBMITTED" },
        include: {
          supplier: true,
          scores: true,
        },
      },
    },
  });

  const ranked = event.responses
    .map((response) => ({
      response,
      total: response.scores.reduce(
        (sum, score) => sum + Number(score.weightedScore),
        0,
      ),
    }))
    .sort((left, right) => right.total - left.total);

  const winner = ranked[0];
  if (!winner || winner.response.scores.length === 0) {
    throw new Error("At least one fully scored response is required.");
  }

  const generated = buildAwardRecommendation({
    supplierName:
      winner.response.supplier.tradingName ??
      winner.response.supplier.legalName,
    weightedScore: winner.total,
    bid: winner.response.totalBid
      ? Number(winner.response.totalBid)
      : null,
    currency: winner.response.currencyCode,
    deliveryDays: winner.response.deliveryDays,
  });

  await prisma.sourcingAward.upsert({
    where: { sourcingEventId: event.id },
    update: {
      supplierId: winner.response.supplierId,
      responseId: winner.response.id,
      status: "RECOMMENDED",
      recommendation: generated.recommendation,
      confidence: generated.confidence,
      totalWeightedScore: winner.total,
    },
    create: {
      sourcingEventId: event.id,
      supplierId: winner.response.supplierId,
      responseId: winner.response.id,
      status: "RECOMMENDED",
      recommendation: generated.recommendation,
      confidence: generated.confidence,
      totalWeightedScore: winner.total,
    },
  });

  await prisma.sourcingEvent.update({
    where: { id: event.id },
    data: {
      status: "EVALUATION",
      awardRecommendation: generated.recommendation,
      awardConfidence: generated.confidence,
    },
  });

  revalidatePath(`/app/sourcing/${event.id}/evaluation`);
}

export async function decideSourcingAwardAction(formData: FormData) {
  const user = await requireAnyRole([
    "PROCUREMENT_EXECUTIVE",
    "TENANT_ADMIN",
    "TENANT_OWNER",
  ]);

  const eventId = value(formData, "sourcingEventId");
  const decision = value(formData, "decision");
  const comments = value(formData, "comments");

  const award = await prisma.sourcingAward.findFirstOrThrow({
    where: {
      sourcingEventId: eventId,
      event: { tenantId: user.tenantId },
    },
  });

  const approved = decision === "APPROVED";

  await prisma.$transaction([
    prisma.sourcingAward.update({
      where: { id: award.id },
      data: {
        status: approved ? "APPROVED" : "REJECTED",
        approvedByUserId: approved ? user.id : null,
        approvedAt: approved ? new Date() : null,
        rejectedAt: approved ? null : new Date(),
        decisionComments: comments || null,
      },
    }),
    prisma.sourcingEvent.update({
      where: { id: eventId },
      data: {
        status: approved ? "AWARDED" : "EVALUATION",
        awardedAt: approved ? new Date() : null,
        awardedSupplierId: approved ? award.supplierId : null,
      },
    }),
    prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        actorType: "USER",
        actorId: user.id,
        actorLabel: user.email,
        action: approved
          ? "sourcing_award.approve"
          : "sourcing_award.reject",
        resourceType: "SourcingAward",
        resourceId: award.id,
        after: { decision, comments },
      },
    }),
  ]);

  revalidatePath(`/app/sourcing/${eventId}/evaluation`);
}
