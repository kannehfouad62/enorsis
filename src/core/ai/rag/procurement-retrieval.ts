import { prisma } from "@/lib/prisma";

export type RagSource = {
  type: "POLICY" | "CONTRACT" | "SUPPLIER" | "PROCEDURE";
  id: string;
  title: string;
  reference: string;
  excerpt: string;
  score: number;
};

function termsFromQuestion(question: string) {
  const stop = new Set([
    "the", "and", "for", "that", "with", "from", "this", "what",
    "when", "where", "which", "into", "our", "are", "can", "how",
    "should", "would", "could", "about", "have", "has", "does",
  ]);

  return [...new Set(
    question
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, " ")
      .split(/\s+/)
      .filter((term) => term.length >= 3 && !stop.has(term)),
  )].slice(0, 10);
}

function textScore(text: string, terms: string[]) {
  const normalized = text.toLowerCase();
  return terms.reduce(
    (score, term) => score + (normalized.includes(term) ? 1 : 0),
    0,
  );
}

function jsonText(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value ?? "");
  }
}

export async function retrieveProcurementKnowledge(input: {
  tenantId: string;
  question: string;
  limit?: number;
}) {
  const terms = termsFromQuestion(input.question);
  const limit = Math.max(4, Math.min(input.limit ?? 12, 20));

  const contractOr = terms.flatMap((term) => [
    { title: { contains: term, mode: "insensitive" as const } },
    { contractNumber: { contains: term, mode: "insensitive" as const } },
    { summary: { contains: term, mode: "insensitive" as const } },
  ]);

  const supplierOr = terms.flatMap((term) => [
    { legalName: { contains: term, mode: "insensitive" as const } },
    { tradingName: { contains: term, mode: "insensitive" as const } },
    { supplierNumber: { contains: term, mode: "insensitive" as const } },
  ]);

  const [contracts, suppliers, policies, procedures] = await Promise.all([
    prisma.contract.findMany({
      where: {
        tenantId: input.tenantId,
        ...(contractOr.length > 0 ? { OR: contractOr } : {}),
      },
      select: {
        id: true,
        contractNumber: true,
        title: true,
        summary: true,
        status: true,
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.supplier.findMany({
      where: {
        tenantId: input.tenantId,
        ...(supplierOr.length > 0 ? { OR: supplierOr } : {}),
      },
      select: {
        id: true,
        supplierNumber: true,
        legalName: true,
        tradingName: true,
        status: true,
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.enterprisePolicyDefinition.findMany({
      include: {
        tenantOverrides: {
          where: { tenantId: input.tenantId },
          take: 1,
        },
      },
      take: 100,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.workflowDefinition.findMany({
      where: { tenantId: input.tenantId },
      select: {
        id: true,
        key: true,
        name: true,
        version: true,
      },
      take: 100,
      orderBy: [{ key: "asc" }, { version: "desc" }],
    }),
  ]);

  const sources: RagSource[] = [];

  for (const contract of contracts) {
    const excerpt = [
      contract.summary ?? "",
      `Status: ${contract.status}`,
    ].filter(Boolean).join(" · ");

    sources.push({
      type: "CONTRACT",
      id: contract.id,
      title: contract.title,
      reference: contract.contractNumber,
      excerpt: excerpt.slice(0, 1200),
      score: Math.max(
        1,
        textScore(
          `${contract.contractNumber} ${contract.title} ${excerpt}`,
          terms,
        ),
      ),
    });
  }

  for (const supplier of suppliers) {
    const title =
      supplier.tradingName || supplier.legalName || supplier.supplierNumber;
    const excerpt =
      `Supplier ${supplier.supplierNumber} · Status ${supplier.status}`;

    sources.push({
      type: "SUPPLIER",
      id: supplier.id,
      title,
      reference: supplier.supplierNumber,
      excerpt,
      score: Math.max(
        1,
        textScore(
          `${supplier.supplierNumber} ${supplier.legalName} ${supplier.tradingName ?? ""} ${supplier.status}`,
          terms,
        ),
      ),
    });
  }

  for (const policy of policies) {
    const effectiveValue =
      policy.tenantOverrides[0]?.value ?? policy.defaultValue;
    const text =
      `${policy.key} ${policy.name} ${policy.category} ` +
      `${policy.description ?? ""} ${jsonText(effectiveValue)}`;
    const score = textScore(text, terms);

    if (terms.length === 0 || score > 0) {
      sources.push({
        type: "POLICY",
        id: policy.id,
        title: policy.name,
        reference: policy.key,
        excerpt:
          `${policy.description ?? "Enterprise policy"} · ` +
          `Effective value: ${jsonText(effectiveValue)}`.slice(0, 1200),
        score: Math.max(1, score),
      });
    }
  }

  for (const procedure of procedures) {
    const text =
      `${procedure.key} ${procedure.name} version ${procedure.version}`;
    const score = textScore(text, terms);

    if (terms.length === 0 || score > 0) {
      sources.push({
        type: "PROCEDURE",
        id: procedure.id,
        title: procedure.name,
        reference: `${procedure.key}:v${procedure.version}`,
        excerpt:
          `Configured Enorsis workflow procedure, version ${procedure.version}.`,
        score: Math.max(1, score),
      });
    }
  }

  return sources
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.title.localeCompare(right.title);
    })
    .slice(0, limit);
}

export function buildGroundedProcurementPrompt(input: {
  question: string;
  sources: RagSource[];
}) {
  const evidence =
    input.sources.length === 0
      ? "No tenant knowledge sources matched this request."
      : input.sources
          .map(
            (source, index) =>
              `[${index + 1}] ${source.type} | ${source.title} | ` +
              `${source.reference}\n${source.excerpt}`,
          )
          .join("\n\n");

  return [
    "You are the Enorsis Unified Procurement AI.",
    "Answer only from the tenant evidence below and general procurement reasoning that does not contradict that evidence.",
    "Do not invent company policy, contract terms, supplier facts, approvals, thresholds, or workflow requirements.",
    "When a factual statement depends on retrieved tenant evidence, cite it using [1], [2], etc.",
    "If evidence is insufficient, explicitly say what information is missing.",
    "Any supplier award, contract execution, purchase-order release, payment release, bank-detail change, or access-role change requires human approval.",
    "",
    "USER QUESTION",
    input.question,
    "",
    "RETRIEVED TENANT EVIDENCE",
    evidence,
    "",
    "Provide:",
    "1. Direct answer",
    "2. Evidence and reasoning",
    "3. Risks or exceptions",
    "4. Recommended next action",
    "5. Human approval required, if applicable",
  ].join("\n");
}
