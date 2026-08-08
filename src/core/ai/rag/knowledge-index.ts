import { createHash } from "node:crypto";
import { getOpenAiClient } from "@/core/ai/client";
import { prisma } from "@/lib/prisma";

const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

export function chunkKnowledgeText(
  input: string,
  maxCharacters = 2200,
) {
  const normalized = input.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (
      current &&
      current.length + paragraph.length + 2 > maxCharacters
    ) {
      chunks.push(current);
      current = "";
    }

    if (paragraph.length > maxCharacters) {
      if (current) {
        chunks.push(current);
        current = "";
      }

      for (let index = 0; index < paragraph.length; index += maxCharacters) {
        chunks.push(paragraph.slice(index, index + maxCharacters));
      }
      continue;
    }

    current = current
      ? `${current}\n\n${paragraph}`
      : paragraph;
  }

  if (current) chunks.push(current);
  return chunks;
}

export function knowledgeContentHash(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

export async function createEmbeddings(texts: string[]) {
  if (texts.length === 0) return [];

  const client = getOpenAiClient();
  const vectors: number[][] = [];

  for (let index = 0; index < texts.length; index += 50) {
    const batch = texts.slice(index, index + 50);
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      encoding_format: "float",
    });

    vectors.push(
      ...response.data
        .sort((left, right) => left.index - right.index)
        .map((item) => item.embedding),
    );
  }

  return vectors;
}

function asVector(value: unknown) {
  if (
    Array.isArray(value) &&
    value.every((item) => typeof item === "number")
  ) {
    return value as number[];
  }

  return null;
}

function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  if (length === 0) return 0;

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }

  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export async function semanticSearchEnterpriseKnowledge(input: {
  tenantId: string;
  query: string;
  limit?: number;
}) {
  const [queryEmbedding] = await createEmbeddings([input.query]);
  if (!queryEmbedding) return [];

  const chunks = await prisma.enterpriseKnowledgeChunk.findMany({
    where: {
      tenantId: input.tenantId,
      source: { status: "ACTIVE" },
    },
    include: {
      source: true,
    },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  return chunks
    .map((chunk) => {
      const vector = asVector(chunk.embedding);
      return {
        chunkId: chunk.id,
        sourceId: chunk.source.id,
        sourceType: chunk.source.sourceType,
        title: chunk.source.title,
        reference:
          chunk.source.externalReference ?? chunk.source.id,
        content: chunk.content,
        score: vector
          ? cosineSimilarity(queryEmbedding, vector)
          : 0,
      };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, Math.min(input.limit ?? 8, 20)));
}

export async function indexEnterpriseKnowledgeSource(input: {
  sourceId: string;
  tenantId: string;
  content: string;
}) {
  const chunks = chunkKnowledgeText(input.content);
  const embeddings = await createEmbeddings(chunks);

  await prisma.$transaction(async (tx) => {
    await tx.enterpriseKnowledgeChunk.deleteMany({
      where: {
        sourceId: input.sourceId,
        tenantId: input.tenantId,
      },
    });

    for (let index = 0; index < chunks.length; index += 1) {
      const content = chunks[index] ?? "";
      await tx.enterpriseKnowledgeChunk.create({
        data: {
          tenantId: input.tenantId,
          sourceId: input.sourceId,
          ordinal: index,
          content,
          tokenEstimate: Math.ceil(content.length / 4),
          embedding: embeddings[index] ?? null,
          embeddingModel: EMBEDDING_MODEL,
        },
      });
    }

    await tx.enterpriseKnowledgeSource.update({
      where: { id: input.sourceId },
      data: {
        status: "ACTIVE",
        contentHash: knowledgeContentHash(input.content),
        metadata: {
          indexedChunks: chunks.length,
          embeddingModel: EMBEDDING_MODEL,
          indexedAt: new Date().toISOString(),
        },
      },
    });
  });

  return chunks.length;
}
