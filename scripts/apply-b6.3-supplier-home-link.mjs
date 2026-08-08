#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/app/supplier/portal/[token]/page.tsx",
);

let source = fs.readFileSync(file, "utf8");

if (source.includes('Documents & requests')) {
  console.log("Supplier collaboration link already present.");
  process.exit(0);
}

if (!source.includes('import {')) {
  throw new Error("Could not locate supplier self-service page imports.");
}

if (!source.includes('from "lucide-react";')) {
  throw new Error("Could not locate Lucide import.");
}

if (!source.includes('import Link from "next/link";')) {
  source = `import Link from "next/link";\n${source}`;
}

const marker = `        <section className="mt-8 grid gap-6 xl:grid-cols-3">`;

const link = `        <div className="mt-6">
          <Link
            href={\`/supplier/portal/\${token}/collaboration\`}
            className="inline-flex rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-900"
          >
            Documents & requests
          </Link>
        </div>

`;

if (!source.includes(marker)) {
  throw new Error("Could not locate supplier portal content marker.");
}

source = source.replace(marker, `${link}${marker}`);
fs.writeFileSync(file, source);
console.log("Added Documents & requests link to supplier self-service home.");
