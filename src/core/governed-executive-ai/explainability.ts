import type { DeterministicExecutiveInsightCandidate } from "./types";

export function rankExecutiveInsightCandidates(
  candidates: DeterministicExecutiveInsightCandidate[],
) {
  const severityWeight = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  } as const;

  return [...candidates].sort((left, right) => {
    const severityDelta =
      severityWeight[right.severity] -
      severityWeight[left.severity];

    if (severityDelta !== 0) return severityDelta;

    const reviewDelta =
      Number(right.requiresHumanReview ?? false) -
      Number(left.requiresHumanReview ?? false);

    if (reviewDelta !== 0) return reviewDelta;

    return right.confidenceScore - left.confidenceScore;
  });
}

export function executiveInsightRationale(
  candidate: DeterministicExecutiveInsightCandidate,
) {
  return {
    ruleId: candidate.insightKey,
    reasoningMode: "DETERMINISTIC_CROSS_DOMAIN_CORRELATION",
    confidenceScore: candidate.confidenceScore,
    evidenceCount: candidate.evidence.length,
    humanReviewRequired: candidate.requiresHumanReview ?? false,
    sourceModules: Array.from(
      new Set([
        candidate.sourceModule,
        ...candidate.evidence.map((item) => item.sourceType),
      ]),
    ),
  };
}
