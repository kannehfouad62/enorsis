#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(
  process.cwd(),
  "prisma/schema.prisma",
);

let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model EnterpriseKnowledgeSource")) {
  console.log("Enterprise RAG schema already present.");
  process.exit(0);
}

schema += `

model EnterpriseKnowledgeSource {
  id                String   @id @default(cuid())
  tenantId          String
  sourceType        String
  title             String
  description       String?
  externalReference String?
  status            String   @default("ACTIVE")
  contentHash       String?
  metadata          Json?
  createdByUserId   String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  chunks EnterpriseKnowledgeChunk[]

  @@index([tenantId, status])
  @@index([tenantId, sourceType])
}

model EnterpriseKnowledgeChunk {
  id             String   @id @default(cuid())
  tenantId       String
  sourceId       String
  ordinal        Int
  content        String
  tokenEstimate  Int      @default(0)
  embedding      Json?
  embeddingModel String?
  metadata       Json?
  createdAt      DateTime @default(now())

  source EnterpriseKnowledgeSource @relation(
    fields: [sourceId],
    references: [id],
    onDelete: Cascade
  )

  @@unique([sourceId, ordinal])
  @@index([tenantId])
  @@index([tenantId, sourceId])
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added Enterprise RAG knowledge schema.");
