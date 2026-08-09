#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

if (schema.includes("model PublicSitePublication")) {
  console.log("Public website publishing schema already present.");
  process.exit(0);
}

schema += `

model PublicSitePublication {
  id                String   @id @default(cuid())
  slug              String   @unique
  category          String
  title             String
  summary           String
  body              String
  readTime          String?
  status            String   @default("DRAFT")
  featured          Boolean  @default(false)
  publishedAt       DateTime?
  createdByUserId   String
  updatedByUserId   String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([status, publishedAt], map: "PublicPublication_status_idx")
  @@index([featured, status], map: "PublicPublication_featured_idx")
}

model PublicSiteGuide {
  id                String   @id @default(cuid())
  slug              String   @unique
  title             String
  summary           String
  resourceType      String
  pageCount         Int?
  fileUrl           String
  fileName          String
  status            String   @default("DRAFT")
  featured          Boolean  @default(false)
  publishedAt       DateTime?
  createdByUserId   String
  updatedByUserId   String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([status, publishedAt], map: "PublicGuide_status_idx")
  @@index([featured, status], map: "PublicGuide_featured_idx")
}

model PublicSiteJobOpening {
  id                String   @id @default(cuid())
  slug              String   @unique
  title             String
  department        String
  location          String
  employmentType    String
  workArrangement   String?
  summary           String
  description       String
  applyUrl          String?
  applyEmail        String?
  status            String   @default("DRAFT")
  publishedAt       DateTime?
  closesAt          DateTime?
  createdByUserId   String
  updatedByUserId   String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([status, publishedAt], map: "PublicJob_status_idx")
  @@index([department, status], map: "PublicJob_department_idx")
}
`;

fs.writeFileSync(schemaPath, schema);
console.log("Added public website publication, guide and career publishing schema.");
