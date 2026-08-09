#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(
  process.cwd(),
  "src/app/globals.css",
);

let source =
  fs.readFileSync(file, "utf8");

const marker =
  "/* Pre-Phase C public publishing + pricing stabilization */";

if (source.includes(marker)) {
  console.log(
    "Public publishing and pricing stabilization CSS already present.",
  );
  process.exit(0);
}

source += `


/* -------------------------------------------------------------------------- */
/* Pre-Phase C public publishing + pricing stabilization                       */
/* -------------------------------------------------------------------------- */

.pricing-sales-link{display:inline-flex;min-height:46px;width:100%;align-items:center;justify-content:center;gap:8px;border-radius:11px;background:#0d5be1;padding:12px 16px;font-size:13px;font-weight:900;color:#fff;transition:transform .18s,box-shadow .18s,background .18s}.pricing-sales-link:hover{transform:translateY(-1px);background:#084bc0;box-shadow:0 12px 28px rgba(13,91,225,.22)}

.publisher-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;border:1px solid #dfe6f1;border-radius:22px;background:#fff;padding:24px;box-shadow:0 20px 55px rgba(22,48,103,.07)}.publisher-form label{display:block;font-size:12px;font-weight:850;color:#34445f}.publisher-form .public-form-control{margin-top:8px}.publisher-span-2{grid-column:1/-1}.publisher-textarea{min-height:110px;resize:vertical}.publisher-body{min-height:210px}.publisher-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px}.publisher-mini-button{display:inline-flex;align-items:center;gap:6px;border:1px solid #d7dfed;border-radius:9px;background:#fff;padding:7px 10px;font-size:10px;font-weight:900;color:#53627a}.publisher-mini-button:hover{border-color:#8ba7dc;color:#174ba4}.publisher-access-note{display:flex;align-items:center;gap:8px;margin-top:20px;border-radius:12px;background:#eef5ff;padding:12px 14px;font-size:11px;font-weight:800;color:#2c548e}

.publication-responsive-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.managed-content-card{display:flex;min-height:285px;flex-direction:column;border:1px solid #e0e7f1;border-radius:18px;background:#fff;padding:22px;box-shadow:0 16px 38px rgba(22,48,103,.055)}.managed-content-featured{grid-column:span 2;background:linear-gradient(145deg,#f4f7ff,#fff);border-color:#cfdcf5}.managed-content-card h2{margin-top:14px;font-size:22px;line-height:1.16;letter-spacing:-.025em;font-weight:900;color:#0c1930}.managed-content-card p{margin-top:12px;line-height:1.7;color:#66758c}.managed-content-footer{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-top:auto;padding-top:20px}

.resource-responsive-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.managed-guide-card{display:grid;grid-template-columns:170px 1fr;overflow:hidden;border:1px solid #e0e7f1;border-radius:20px;background:#fff;box-shadow:0 16px 40px rgba(22,48,103,.055)}.managed-guide-cover{display:flex;min-height:290px;flex-direction:column;justify-content:flex-end;background:linear-gradient(155deg,#082968,#194db8 58%,#5b4fd8);padding:20px;color:#fff}.managed-guide-cover svg{margin-bottom:auto;color:#7bdbff}.managed-guide-cover span{font-size:8px;font-weight:900;letter-spacing:.14em}.managed-guide-cover strong{margin-top:8px;font-size:14px;line-height:1.2}.managed-guide-copy{display:flex;flex-direction:column;padding:22px}.managed-guide-copy h2{margin-top:14px;font-size:22px;line-height:1.15;font-weight:900;color:#0c1930}.managed-guide-copy p{margin-top:12px;line-height:1.7;color:#66758c}.download-resource-button{display:inline-flex;align-items:center;gap:7px;border-radius:10px;background:#0d5be1;padding:10px 13px;font-size:11px;font-weight:900;color:#fff}

.career-opening-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.career-opening-card{display:flex;min-height:300px;flex-direction:column;border:1px solid #dfe6f1;border-radius:19px;background:#fff;padding:22px;box-shadow:0 16px 38px rgba(22,48,103,.055)}.career-opening-meta{display:flex;flex-wrap:wrap;gap:12px}.career-opening-meta span{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:850;color:#60708b}.career-opening-card h2{margin-top:18px;font-size:24px;line-height:1.1;font-weight:900;color:#0d1a32}.career-opening-card>p{margin-top:12px;line-height:1.7;color:#64748b}.career-tag-row{display:flex;flex-wrap:wrap;gap:7px;margin-top:16px}.career-tag-row span{border-radius:999px;background:#edf4ff;padding:7px 9px;font-size:9px;font-weight:900;color:#315b9a}

@media(max-width:980px){.publication-responsive-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.managed-content-featured{grid-column:auto}.resource-responsive-grid{grid-template-columns:1fr}.career-opening-grid{grid-template-columns:1fr}}
@media(max-width:680px){.publisher-form{grid-template-columns:1fr;padding:18px}.publisher-span-2{grid-column:auto}.publisher-actions{flex-direction:column-reverse;align-items:stretch}.publisher-actions .button-primary,.publisher-actions .button-secondary{width:100%}.publication-responsive-grid{grid-template-columns:1fr}.managed-guide-card{grid-template-columns:1fr}.managed-guide-cover{min-height:190px}.career-opening-card{padding:18px}}

`;

fs.writeFileSync(file, source);

console.log(
  "Added responsive public publishing, resource, career and pricing styles.",
);
