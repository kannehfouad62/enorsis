#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const file=path.join(process.cwd(),"src/core/modules/registry.ts");
let source=fs.readFileSync(file,"utf8");
if(source.includes('"/app/analytics/predictive-inventory"')){console.log("Predictive Inventory Optimization metadata already present.");process.exit(0);}
const entry=`  "/app/analytics/predictive-inventory": {
    id: "predictive-inventory-optimization",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`;
const preferred=`  "/app/analytics/predictive-procurement": {
    id: "predictive-procurement-forecasting",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`;
const fallback=`  "/app/analytics/process-mining": {
    id: "enterprise-process-mining",
    featureKey: FEATURE_KEYS.AI_PLATFORM,
    aiEligible: true,
  },
`;
const marker=source.includes(preferred)?preferred:fallback;
if(!source.includes(marker))throw new Error("Could not locate predictive procurement or process-mining registry metadata.");
source=source.replace(marker,`${marker}${entry}`);
fs.writeFileSync(file,source);
console.log("Registered Predictive Inventory Optimization metadata.");
