export interface WeightedCriterion {
  id: string;
  name: string;
  weight: number;
}

export interface CriterionScoreInput {
  criterionId: string;
  score: number;
  rationale?: string;
}

export function calculateWeightedScore(
  criteria: WeightedCriterion[],
  scores: CriterionScoreInput[],
) {
  const byCriterion = new Map(scores.map((score) => [score.criterionId, score]));

  const results = criteria.map((criterion) => {
    const input = byCriterion.get(criterion.id);
    const score = input?.score ?? 0;
    const weightedScore = (score * criterion.weight) / 100;

    return {
      criterionId: criterion.id,
      score,
      weightedScore,
      rationale: input?.rationale ?? null,
    };
  });

  return {
    results,
    total: results.reduce((sum, result) => sum + result.weightedScore, 0),
  };
}

export function buildAwardRecommendation({
  supplierName,
  weightedScore,
  bid,
  currency,
  deliveryDays,
}: {
  supplierName: string;
  weightedScore: number;
  bid: number | null;
  currency: string;
  deliveryDays: number | null;
}) {
  const confidence = Math.max(50, Math.min(99, Math.round(weightedScore)));

  return {
    confidence,
    recommendation:
      `${supplierName} is recommended with a weighted evaluation score of ` +
      `${weightedScore.toFixed(2)}. Commercial bid: ${currency} ` +
      `${bid?.toFixed(2) ?? "not provided"}; delivery: ` +
      `${deliveryDays ?? "not provided"} days. This recommendation remains ` +
      `subject to human award approval and final commercial due diligence.`,
  };
}
