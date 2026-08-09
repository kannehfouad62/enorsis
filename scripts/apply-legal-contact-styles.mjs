#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "src/app/globals.css");
let source = fs.readFileSync(file, "utf8");

const marker = "/* Enorsis legal + contact pages */";

if (source.includes(marker)) {
  console.log("Legal/contact page styles already present.");
  process.exit(0);
}

source += `

/* Enorsis legal + contact pages */
.legal-page{background:linear-gradient(145deg,#f8faff,#fff 54%,#f2f6ff);padding:64px 20px 90px}.legal-shell{max-width:900px;margin:0 auto;border:1px solid #e0e7f1;border-radius:24px;background:#fff;padding:clamp(24px,5vw,56px);box-shadow:0 24px 70px rgba(23,48,102,.07);color:#53627a}.legal-shell h1{margin-top:10px;font-size:clamp(2.5rem,6vw,4.3rem);line-height:1;letter-spacing:-.05em;font-weight:950;color:#0b1830}.legal-shell h2{margin-top:34px;font-size:20px;font-weight:900;color:#13213a}.legal-shell p{margin-top:14px;font-size:15px;line-height:1.8}.legal-shell a{font-weight:800;color:#1458c8;text-decoration:underline}.legal-updated{font-size:12px!important;font-weight:750;color:#8290a5}
.contact-page{min-height:calc(100vh - 72px);background:linear-gradient(145deg,#f5f8ff,#fff 58%,#edf4ff)}.contact-layout{display:grid;grid-template-columns:.8fr 1.2fr;gap:54px;max-width:1120px;margin:0 auto;align-items:start}.contact-title{margin-top:12px;font-size:clamp(2.7rem,5vw,4.7rem);line-height:.98;letter-spacing:-.05em;font-weight:950;color:#0b1830}.contact-copy{max-width:500px;margin-top:20px;font-size:16px;line-height:1.75;color:#64748b}.contact-email-link{display:inline-flex;align-items:center;gap:8px;margin-top:24px;font-size:14px;font-weight:900;color:#1458c8}.contact-trust-list{display:grid;gap:10px;margin-top:24px}.contact-trust-list span{display:flex;align-items:flex-start;gap:8px;font-size:11px;font-weight:750;color:#59708f}.contact-trust-list svg{flex:none;color:#2563eb}.contact-form-card{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;border:1px solid #dce5f1;border-radius:24px;background:#fff;padding:26px;box-shadow:0 28px 75px rgba(23,48,102,.1)}.contact-form-card label{display:block;font-size:12px;font-weight:850;color:#34445f}.contact-form-card .public-form-control{margin-top:8px}.contact-span-2{grid-column:1/-1}.contact-message{min-height:170px;resize:vertical}.contact-submit{width:100%;min-height:50px;justify-content:center}.footer-legal-links{display:flex;flex-wrap:wrap;gap:14px;margin-top:18px;font-size:11px}.footer-legal-links a{color:inherit;text-decoration:none}.footer-legal-links a:hover{text-decoration:underline}
@media(max-width:820px){.contact-layout{grid-template-columns:1fr;gap:30px}}
@media(max-width:620px){.contact-form-card{grid-template-columns:1fr;padding:18px}.contact-span-2{grid-column:auto}.legal-page{padding-inline:12px}}
`;

fs.writeFileSync(file, source);
console.log("Added responsive legal and Contact Us page styles.");
