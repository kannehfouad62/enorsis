#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "src/app/globals.css");
let source = fs.readFileSync(file, "utf8");

const marker =
  "/* Pre-Phase C visual + form stabilization */";

if (source.includes(marker)) {
  console.log(
    "Pre-Phase C visual and form stabilization CSS already present.",
  );
  process.exit(0);
}

source += `


/* -------------------------------------------------------------------------- */
/* Pre-Phase C visual + form stabilization                                    */
/* -------------------------------------------------------------------------- */

.global-procurement-hero{
  position:relative;
  overflow:hidden;
  border-bottom:1px solid #dce5f3;
  background:
    radial-gradient(circle at 76% 28%,rgba(82,103,255,.16),transparent 27%),
    radial-gradient(circle at 64% 78%,rgba(39,203,255,.13),transparent 25%),
    linear-gradient(120deg,#ffffff 0%,#f7f9ff 38%,#edf3ff 72%,#fafcff 100%);
}
.procurement-aurora{position:absolute;border-radius:999px;filter:blur(65px);pointer-events:none;opacity:.7}
.procurement-aurora-a{right:-110px;top:40px;width:430px;height:430px;background:rgba(88,68,255,.16)}
.procurement-aurora-b{left:35%;bottom:-220px;width:450px;height:450px;background:rgba(23,185,255,.12)}
.hero-proof-pill{display:inline-flex;align-items:center;gap:8px;border:1px solid #d8d9ff;border-radius:999px;background:rgba(255,255,255,.84);padding:9px 14px;font-size:11px;font-weight:900;letter-spacing:.02em;color:#5445ca;box-shadow:0 9px 25px rgba(68,74,150,.08);backdrop-filter:blur(12px)}
.hero-modern-title{max-width:760px;margin-top:24px;font-size:clamp(3.1rem,5.4vw,5.25rem);font-weight:950;line-height:.96;letter-spacing:-.055em;color:#071328}
.hero-modern-title span{background:linear-gradient(95deg,#0865e8,#4b4ce2 52%,#8b38e8);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero-modern-copy{max-width:700px;margin-top:24px;font-size:17px;line-height:1.75;color:#5e6c85}
.org-type-row{display:flex;flex-wrap:wrap;gap:9px;margin-top:28px}.org-type-chip{display:inline-flex;align-items:center;gap:7px;border:1px solid #dce4f1;border-radius:10px;background:rgba(255,255,255,.78);padding:9px 11px;font-size:11px;font-weight:850;color:#23395f}
.hero-trust-line{display:flex;align-items:flex-start;gap:8px;margin-top:18px;font-size:11px;font-weight:700;line-height:1.5;color:#61708a}.hero-trust-line svg{flex:none;color:#0d5be1}

.s2p-universe{position:relative;isolation:isolate;width:min(100%,780px);height:620px;margin-inline:auto}
.network-grid{position:absolute;inset:4% 2% 2%;border-radius:40px;background:linear-gradient(rgba(83,112,185,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(83,112,185,.08) 1px,transparent 1px);background-size:36px 36px;mask-image:radial-gradient(circle,#000 25%,rgba(0,0,0,.78) 60%,transparent 84%)}
.procurement-core{position:absolute;left:50%;top:47%;z-index:10;display:flex;width:168px;height:168px;transform:translate(-50%,-50%);flex-direction:column;align-items:center;justify-content:center;border:1px solid rgba(126,158,235,.8);border-radius:50%;background:radial-gradient(circle at 34% 27%,rgba(255,255,255,.96),#e8efff 42%,#b9cafa 76%,#849fea 100%);box-shadow:0 0 0 13px rgba(255,255,255,.62),0 0 0 14px rgba(115,142,225,.3),0 28px 80px rgba(32,66,153,.28)}
.core-pulse{position:absolute;inset:-26px;border:1px solid rgba(71,109,221,.27);border-radius:50%;animation:corePulse 3.2s ease-in-out infinite}.core-mark{position:relative}.hero-logo-orbit{width:48px;height:48px}.procurement-core strong{margin-top:10px;font-size:15px;letter-spacing:.15em;color:#0b347f}.procurement-core small{margin-top:3px;font-size:7px;font-weight:900;letter-spacing:.13em;color:#60749d}
.network-orbit{position:absolute;left:50%;top:47%;border:1px solid rgba(55,91,201,.28);border-radius:50%;transform:translate(-50%,-50%)}.network-orbit-one{width:380px;height:380px}.network-orbit-two{width:560px;height:490px;border-style:dashed;animation:networkSpin 34s linear infinite}
.s2p-flow-ring{position:absolute;inset:0}.s2p-step{position:absolute;z-index:9;display:flex;min-width:92px;align-items:center;justify-content:center;gap:6px;border:1px solid #cdd9f0;border-radius:11px;background:rgba(255,255,255,.9);padding:9px 10px;font-size:10px;font-weight:900;color:#164ba9;box-shadow:0 10px 28px rgba(31,66,143,.12);backdrop-filter:blur(10px)}
.s2p-step-1{left:14%;top:31%}.s2p-step-2{left:23%;top:14%}.s2p-step-3{right:23%;top:14%}.s2p-step-4{right:12%;top:34%}.s2p-step-5{right:24%;bottom:17%}.s2p-step-6{left:24%;bottom:17%}
.supplier-network-label{position:absolute;left:50%;top:3%;display:flex;transform:translateX(-50%);align-items:center;gap:7px;border:1px solid #cbd8f0;border-radius:999px;background:#fff;padding:8px 12px;font-size:9px;font-weight:900;letter-spacing:.04em;color:#48638f;box-shadow:0 8px 22px rgba(37,64,120,.08)}
.supplier-region-node{position:absolute;z-index:5;display:flex;align-items:center;gap:6px;font-size:8px;font-weight:900;color:#47628e}.supplier-node-dot{width:9px;height:9px;border:2px solid #fff;border-radius:50%;background:#326af1;box-shadow:0 0 0 4px rgba(50,106,241,.12),0 0 18px #5ebdff}
.supplier-particle{position:absolute;z-index:4;width:5px;height:5px;border-radius:50%;background:#52c8ff;box-shadow:0 0 12px #52c8ff;animation:particleTravel 5.5s ease-in-out infinite}.particle-a{left:20%;top:27%}.particle-b{right:22%;top:28%;animation-delay:-1.4s}.particle-c{right:22%;bottom:25%;animation-delay:-2.7s}.particle-d{left:23%;bottom:25%;animation-delay:-4s}
.network-stat{position:absolute;z-index:12;display:flex;align-items:flex-start;gap:9px;width:205px;border:1px solid rgba(121,151,219,.55);border-radius:13px;background:rgba(8,30,77,.92);padding:11px;color:#fff;box-shadow:0 15px 35px rgba(7,31,88,.2);backdrop-filter:blur(12px)}.network-stat>svg{flex:none;color:#70d6ff}.network-stat b{display:block;font-size:10px}.network-stat span{display:block;margin-top:3px;font-size:8px;line-height:1.4;color:#b9c8e6}.stat-suppliers{left:0;bottom:4%}.stat-ai{right:0;bottom:4%}.stat-industry{left:50%;bottom:-1%;transform:translateX(-50%)}

.s2p-capability-strip{display:grid;grid-template-columns:1.6fr repeat(6,1fr);overflow:hidden;border:1px solid #dce6f5;border-radius:17px;background:rgba(255,255,255,.92);box-shadow:0 18px 45px rgba(26,55,113,.09)}.s2p-strip-heading{padding:18px 20px}.s2p-strip-heading span{display:block;font-size:9px;font-weight:950;letter-spacing:.15em;text-transform:uppercase;color:#5d55db}.s2p-strip-heading b{display:block;margin-top:5px;font-size:11px;color:#34445f}.s2p-strip-step{display:flex;min-height:70px;align-items:center;justify-content:center;gap:6px;border-left:1px solid #e7edf6;padding:13px 8px;font-size:10px;color:#174a9e}.s2p-strip-number{font-size:8px;font-weight:950;color:#8391a9}.s2p-strip-step b{font-size:10px}
.industry-marquee{display:grid;grid-template-columns:repeat(8,1fr);gap:10px;margin-top:14px}.industry-marquee span{text-align:center;font-size:8px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#8090a8}

@keyframes corePulse{50%{transform:scale(1.06);opacity:.35}}@keyframes networkSpin{to{transform:translate(-50%,-50%) rotate(360deg)}}@keyframes particleTravel{50%{transform:translate(55px,36px);opacity:.25}}
@media (prefers-reduced-motion:reduce){.core-pulse,.network-orbit-two,.supplier-particle{animation:none!important}.s2p-universe *{scroll-behavior:auto!important}}

@media(max-width:1024px){
  .s2p-universe{height:600px;max-width:720px}
  .s2p-capability-strip{grid-template-columns:repeat(3,1fr)}
  .s2p-strip-heading{grid-column:1/-1}
  .s2p-strip-step{border-top:1px solid #e7edf6}
  .industry-marquee{grid-template-columns:repeat(4,1fr)}
}
@media(max-width:760px){
  .global-procurement-hero .wide-shell{width:min(100% - 24px,1480px)}
  .hero-modern-title{font-size:clamp(2.65rem,12vw,4rem);line-height:.98}
  .hero-modern-copy{font-size:15px;line-height:1.7}
  .hero-proof-pill{max-width:100%;font-size:9px}
  .s2p-universe{height:500px;margin-top:8px}
  .network-grid{inset:4% 0 4%;background-size:28px 28px}
  .procurement-core{top:43%;width:128px;height:128px}
  .hero-logo-orbit{width:39px;height:39px}
  .procurement-core strong{font-size:11px}.procurement-core small{font-size:6px}
  .network-orbit{top:43%}.network-orbit-one{width:265px;height:265px}.network-orbit-two{width:340px;height:315px}
  .s2p-step{min-width:auto;padding:7px 8px;font-size:8px}.s2p-step svg{width:12px;height:12px}
  .s2p-step-1{left:5%;top:30%}.s2p-step-2{left:17%;top:13%}.s2p-step-3{right:17%;top:13%}.s2p-step-4{right:4%;top:31%}.s2p-step-5{right:16%;bottom:24%}.s2p-step-6{left:16%;bottom:24%}
  .supplier-region-node{font-size:7px}.supplier-region-node b{display:none}
  .supplier-network-label{top:1%;font-size:7px}
  .network-stat{width:46%;padding:9px}.network-stat b{font-size:8px}.network-stat span{font-size:7px}.network-stat>svg{width:13px;height:13px}
  .stat-suppliers{left:2%;bottom:2%}.stat-ai{right:2%;bottom:2%}.stat-industry{display:none}
  .s2p-capability-strip{grid-template-columns:repeat(2,1fr)}
  .s2p-strip-heading{grid-column:1/-1}
  .s2p-strip-step{min-height:58px}
  .industry-marquee{grid-template-columns:repeat(2,1fr);gap:7px}
}
@media(max-width:390px){
  .s2p-universe{height:455px}
  .network-orbit-one{width:235px;height:235px}.network-orbit-two{width:300px;height:280px}
  .procurement-core{width:116px;height:116px}
  .s2p-step{font-size:7px;padding:6px}
  .s2p-step-1{left:1%}.s2p-step-4{right:1%}
}

/* Public/demo form system */
.demo-page{min-height:calc(100vh - 72px);background:linear-gradient(145deg,#f7f9ff,#fff 56%,#f1f5ff)}
.public-form-card{border:1px solid #dfe6f1;border-radius:24px;background:#fff;padding:24px;box-shadow:0 24px 70px rgba(23,48,102,.09)}
.public-form-field{display:block;color:#0f172a}.public-form-label{display:flex;align-items:center;gap:7px;margin-bottom:8px;font-size:12px;font-weight:850;color:#34445f}.public-form-label svg{color:#2563eb}
.public-form-control{display:block;width:100%;min-height:48px;appearance:auto;border:1px solid #cfd9e8;border-radius:12px;background:#fff!important;padding:11px 13px;font:inherit;font-size:14px;color:#0f172a!important;box-shadow:0 1px 2px rgba(15,23,42,.03);outline:none;transition:border-color .18s,box-shadow .18s}.public-form-control::placeholder{color:#94a3b8}.public-form-control:focus{border-color:#4f7ff0;box-shadow:0 0 0 4px rgba(79,127,240,.12)}
.public-select{color-scheme:light;background-color:#fff!important}
.public-select option{background:#fff!important;color:#0f172a!important}
.form-checkbox-row{display:flex;align-items:flex-start;gap:10px;border-radius:13px;background:#f8fafc;padding:13px;font-size:12px;line-height:1.55;color:#526174}.form-checkbox-row input{width:16px;height:16px;flex:none;margin-top:1px;accent-color:#2563eb}
.form-success-icon{display:grid;width:46px;height:46px;flex:none;place-items:center;border-radius:14px;background:#ecfdf5;color:#059669}

/* Normalize native browser dropdown menus platform-wide without forcing every
   application input to a light background. This specifically prevents browser
   option menus from inheriting an unreadable black/black presentation. */
select{font:inherit}
select option,select optgroup{background-color:#fff;color:#0f172a}
input,select,textarea{max-width:100%}
input:disabled,select:disabled,textarea:disabled{opacity:.7;cursor:not-allowed}

`;

fs.writeFileSync(file, source);

console.log(
  "Added responsive global procurement hero and platform form stabilization styles.",
);
