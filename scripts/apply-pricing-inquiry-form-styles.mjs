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
  "/* Pricing inquiry form repair */";

if (source.includes(marker)) {
  console.log(
    "Pricing inquiry form styles already present.",
  );
  process.exit(0);
}

source += `

/* Pricing inquiry form repair */
.pricing-inquiry-section{scroll-margin-top:90px;border-top:1px solid #dfe7f2;border-bottom:1px solid #dfe7f2;background:linear-gradient(145deg,#f5f8ff 0%,#ffffff 58%,#eef4ff 100%)}
.pricing-inquiry-layout{display:grid;grid-template-columns:.8fr 1.2fr;gap:54px;align-items:start;max-width:1120px;margin:0 auto}
.pricing-inquiry-copy{position:sticky;top:110px;padding:10px 0}.pricing-inquiry-copy h2{margin-top:10px;max-width:480px;font-size:clamp(2.3rem,4vw,3.7rem);line-height:1;letter-spacing:-.045em;font-weight:950;color:#0a1730}.pricing-inquiry-copy>p:not(.eyebrow-blue){max-width:500px;margin-top:20px;font-size:16px;line-height:1.75;color:#64748b}.pricing-sales-address{display:inline-flex;align-items:center;gap:8px;margin-top:24px;font-size:14px;font-weight:900;color:#1458c8}.pricing-inquiry-trust{display:flex;align-items:flex-start;gap:8px;margin-top:20px;max-width:390px;border-radius:12px;background:#eaf2ff;padding:12px 13px;font-size:11px;font-weight:750;line-height:1.55;color:#3a5f94}.pricing-inquiry-trust svg{flex:none;margin-top:1px}
.pricing-inquiry-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;border:1px solid #dce5f1;border-radius:24px;background:#fff;padding:26px;box-shadow:0 28px 75px rgba(23,48,102,.1)}.pricing-inquiry-form label{display:block;font-size:12px;font-weight:850;color:#34445f}.pricing-inquiry-form label>span:not(.pricing-consent span){font-weight:600;color:#94a3b8}.pricing-inquiry-form .public-form-control{margin-top:8px}.pricing-form-plan{grid-column:1/-1}.pricing-consent{grid-column:1/-1;display:flex!important;align-items:flex-start;gap:10px;border-radius:13px;background:#f8fafc;padding:13px!important;font-size:11px!important;font-weight:650!important;line-height:1.6;color:#64748b!important}.pricing-consent input{width:16px;height:16px;flex:none;margin-top:1px;accent-color:#2563eb}.pricing-consent a{font-weight:850;color:#1458c8;text-decoration:underline}.pricing-submit-button{grid-column:1/-1;min-height:50px;width:100%;justify-content:center}
.pricing-form-success{display:flex;align-items:flex-start;gap:13px;margin-bottom:14px;border:1px solid #a7f3d0;border-radius:16px;background:#ecfdf5;padding:17px;color:#065f46}.pricing-form-success svg{flex:none}.pricing-form-success h3{font-size:15px;font-weight:900}.pricing-form-success p{margin-top:4px;font-size:12px;line-height:1.55}
@media(max-width:860px){.pricing-inquiry-layout{grid-template-columns:1fr;gap:28px}.pricing-inquiry-copy{position:static}.pricing-inquiry-copy h2{font-size:clamp(2.25rem,9vw,3.3rem)}}
@media(max-width:620px){.pricing-inquiry-form{grid-template-columns:1fr;padding:18px}.pricing-form-plan,.pricing-consent,.pricing-submit-button{grid-column:auto}.pricing-inquiry-section .shell{width:min(100% - 24px,1180px)}}
`;

fs.writeFileSync(
  file,
  source,
);

console.log(
  "Added responsive pricing inquiry form styles.",
);
