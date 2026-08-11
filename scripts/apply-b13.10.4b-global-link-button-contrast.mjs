#!/usr/bin/env node

import fs from "node:fs";

const path = "src/app/globals.css";
let source = fs.readFileSync(path, "utf8");

const compactProblem =
  "*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#fff;color:var(--ink);font-family:Arial,Helvetica,sans-serif}a{color:inherit;text-decoration:none}button{font:inherit}";

const compactFixed =
  "*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#fff;color:var(--ink);font-family:Arial,Helvetica,sans-serif}@layer base{a{color:inherit;text-decoration:none}button{font:inherit}}";

const expandedProblem = `* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: #fff;
  color: var(--ink);
  font-family: Arial, Helvetica, sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font: inherit;
}`;

const expandedFixed = `* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: #fff;
  color: var(--ink);
  font-family: Arial, Helvetica, sans-serif;
}

@layer base {
  a {
    color: inherit;
    text-decoration: none;
  }

  button {
    font: inherit;
  }
}`;

if (source.includes(compactProblem)) {
  source = source.replace(compactProblem, compactFixed);
  fs.writeFileSync(path, source);
  console.log("✓ Moved global anchor/button defaults into Tailwind base layer.");
  process.exit(0);
}

if (source.includes(expandedProblem)) {
  source = source.replace(expandedProblem, expandedFixed);
  fs.writeFileSync(path, source);
  console.log("✓ Moved global anchor/button defaults into Tailwind base layer.");
  process.exit(0);
}

if (
  source.includes("@layer base") &&
  !/(^|[};])a\{color:inherit;text-decoration:none\}button\{font:inherit\}/.test(
    source.replace(/@layer base\{a\{color:inherit;text-decoration:none\}button\{font:inherit\}\}/, ""),
  )
) {
  console.log("Global anchor/button defaults already use a Tailwind base layer.");
  process.exit(0);
}

throw new Error(
  "Could not locate the expected global anchor/button defaults. Inspect src/app/globals.css before changing it.",
);
