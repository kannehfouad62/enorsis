#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const file=path.join(process.cwd(),"src/modules/navigation/enterprise-modules.ts");
let source=fs.readFileSync(file,"utf8");
if(source.includes('href: "/app/analytics/predictive-inventory"')){console.log("Predictive Inventory Optimization already registered.");process.exit(0);}
const entry=`  {
    title: "Predictive Inventory Optimization",
    description:
      "Predict stockouts, optimize reorder points and safety stock, and identify excess inventory using demand and stock evidence.",
    href: "/app/analytics/predictive-inventory",
    icon: Warehouse,
    group: "Intelligence",
  },

`;
const preferred=`  {
    title: "Predictive Procurement Forecasting",`;
const fallback=`  {
    title: "Spend Intelligence",`;
const marker=source.includes(preferred)?preferred:fallback;
if(!source.includes(marker))throw new Error("Could not locate Predictive Procurement or Spend Intelligence module anchor.");
source=source.replace(marker,`${entry}${marker}`);
fs.writeFileSync(file,source);
console.log("Registered Predictive Inventory Optimization under Intelligence.");
