export interface MatchLine {
  description: string;
  orderedQuantity: number;
  receivedQuantity: number;
  invoicedQuantity: number;
  orderedUnitPrice: number;
  invoicedUnitPrice: number;
}

export interface MatchTolerance {
  quantityPercent: number;
  pricePercent: number;
}

export function evaluateThreeWayMatch(
  lines: MatchLine[],
  tolerance: MatchTolerance,
) {
  const exceptions: Array<{
    type: "QUANTITY" | "PRICE" | "MISSING_RECEIPT";
    severity: number;
    description: string;
    expectedValue?: number;
    actualValue?: number;
    variance?: number;
  }> = [];

  for (const line of lines) {
    if (line.receivedQuantity <= 0) {
      exceptions.push({
        type: "MISSING_RECEIPT",
        severity: 80,
        description: `No posted receipt exists for ${line.description}.`,
      });
      continue;
    }

    const allowedQuantityVariance =
      line.orderedQuantity * (tolerance.quantityPercent / 100);
    const quantityVariance =
      line.invoicedQuantity - line.receivedQuantity;

    if (Math.abs(quantityVariance) > allowedQuantityVariance) {
      exceptions.push({
        type: "QUANTITY",
        severity: 70,
        description:
          `Invoice quantity for ${line.description} exceeds the configured tolerance.`,
        expectedValue: line.receivedQuantity,
        actualValue: line.invoicedQuantity,
        variance: quantityVariance,
      });
    }

    const allowedPriceVariance =
      line.orderedUnitPrice * (tolerance.pricePercent / 100);
    const priceVariance =
      line.invoicedUnitPrice - line.orderedUnitPrice;

    if (Math.abs(priceVariance) > allowedPriceVariance) {
      exceptions.push({
        type: "PRICE",
        severity: 70,
        description:
          `Invoice price for ${line.description} exceeds the configured tolerance.`,
        expectedValue: line.orderedUnitPrice,
        actualValue: line.invoicedUnitPrice,
        variance: priceVariance,
      });
    }
  }

  return {
    matched: exceptions.length === 0,
    exceptions,
  };
}
