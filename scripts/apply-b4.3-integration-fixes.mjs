#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function replaceOrThrow(source, oldText, newText, label) {
  if (source.includes(newText)) {
    console.log(`Already fixed: ${label}`);
    return source;
  }

  if (!source.includes(oldText)) {
    throw new Error(`Could not locate expected code for: ${label}`);
  }

  console.log(`Fixed: ${label}`);
  return source.replace(oldText, newText);
}

// 1. Fix extractor import filename.
{
  const file = "src/core/ai/rag/document-ingestion.ts";
  let source = read(file);

  source = replaceOrThrow(
    source,
    'import { extractPrivateDocumentText } from "./extractor";',
    'import { extractPrivateDocumentText } from "./document-extractor";',
    "document ingestion extractor import",
  );

  write(file, source);
}

// 2. Guard nullable Vercel Blob stream.
{
  const file = "src/core/ai/rag/document-extractor.ts";
  let source = read(file);

  const oldText = `  const contentType =
    result.blob.contentType?.toLowerCase() ?? "";
  const filename = input.filename.toLowerCase();
  const buffer = await streamToBuffer(result.stream);`;

  const newText = `  const contentType =
    result.blob.contentType?.toLowerCase() ?? "";
  const filename = input.filename.toLowerCase();

  if (!result.stream) {
    throw new Error("Private document blob stream is unavailable.");
  }

  const buffer = await streamToBuffer(result.stream);`;

  source = replaceOrThrow(
    source,
    oldText,
    newText,
    "nullable private blob stream",
  );

  write(file, source);
}

// 3. Replace document queries with explicit Prisma DTO selections.
{
  const file = "src/modules/ai-rag/document-queries.ts";

  const content = `import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const permittedRoles = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "PROCUREMENT_EXECUTIVE",
  "PROCUREMENT_MANAGER",
  "SUPPLIER_MANAGER",
  "RISK_COMPLIANCE",
  "LEGAL",
  "PLATFORM_SUPER_ADMIN",
  "PLATFORM_SUPPORT",
  "PLATFORM_AUDITOR",
]);

export async function getDocumentIngestionWorkspace() {
  const session = await auth();

  if (!session?.user) redirect("/login");

  if (
    !session.user.roles.some((role) => permittedRoles.has(role))
  ) {
    redirect("/app/unauthorized");
  }

  const tenantId = session.user.tenantId;

  const [supplierDocuments, contractDocuments, sources] =
    await Promise.all([
      prisma.supplierDocument.findMany({
        where: {
          supplier: { tenantId },
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          supplier: {
            select: {
              supplierNumber: true,
              legalName: true,
              tradingName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.contractDocument.findMany({
        where: {
          contract: { tenantId },
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          contract: {
            select: {
              contractNumber: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.enterpriseKnowledgeSource.findMany({
        where: {
          tenantId,
          sourceType: {
            in: ["SUPPLIER_DOCUMENT", "CONTRACT_DOCUMENT"],
          },
        },
        select: {
          id: true,
          externalReference: true,
          status: true,
          updatedAt: true,
          _count: {
            select: { chunks: true },
          },
        },
      }),
    ]);

  const sourceMap = new Map(
    sources
      .filter((source) => source.externalReference)
      .map((source) => [
        source.externalReference as string,
        source,
      ]),
  );

  return {
    session,
    supplierDocuments: supplierDocuments.map((document) => ({
      id: document.id,
      name: document.name,
      createdAt: document.createdAt,
      supplier: document.supplier,
      ragSource:
        sourceMap.get(\`supplier-document:\${document.id}\`) ?? null,
    })),
    contractDocuments: contractDocuments.map((document) => ({
      id: document.id,
      name: document.name,
      createdAt: document.createdAt,
      contract: document.contract,
      ragSource:
        sourceMap.get(\`contract-document:\${document.id}\`) ?? null,
    })),
  };
}
`;

  write(file, content);
  console.log("Fixed: document ingestion Prisma query DTOs");
}

// 4. Add FileSearch to Lucide imports in Enterprise Modules.
{
  const file =
    "src/modules/navigation/enterprise-modules.ts";
  let source = read(file);

  if (source.includes("  FileSearch,\n")) {
    console.log("Already fixed: FileSearch icon import");
  } else if (source.includes("  FileKey2,\n")) {
    source = source.replace(
      "  FileKey2,\n",
      "  FileKey2,\n  FileSearch,\n",
    );
    console.log("Fixed: FileSearch icon import");
  } else if (source.includes("  FileText,\n")) {
    source = source.replace(
      "  FileText,\n",
      "  FileSearch,\n  FileText,\n",
    );
    console.log("Fixed: FileSearch icon import");
  } else {
    throw new Error(
      "Could not locate a stable insertion point for FileSearch.",
    );
  }

  write(file, source);
}

console.log("B4.3 integration repair complete.");
