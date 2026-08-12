#!/usr/bin/env node
import fs from "node:fs";

const path = "src/app/globals.css";
let source = fs.readFileSync(path, "utf8");

const marker = `*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#fff;color:var(--ink);font-family:Arial,Helvetica,sans-serif}@layer base{a{color:inherit;text-decoration:none}button{font:inherit}}`;

const replacement = `*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#fff;color:var(--ink);font-family:Arial,Helvetica,sans-serif}@layer base{
  a{color:inherit;text-decoration:none}
  button{font:inherit}

  a[href],
  button:not(:disabled),
  summary,
  select:not(:disabled),
  input[type="button"]:not(:disabled),
  input[type="submit"]:not(:disabled),
  input[type="reset"]:not(:disabled),
  input[type="checkbox"]:not(:disabled),
  input[type="radio"]:not(:disabled),
  [role="button"]:not([aria-disabled="true"]),
  [role="link"]:not([aria-disabled="true"]),
  [data-clickable="true"]:not([aria-disabled="true"]),
  label:has(input[type="checkbox"]:not(:disabled)),
  label:has(input[type="radio"]:not(:disabled)){
    cursor:pointer;
  }

  button:disabled,
  select:disabled,
  input:disabled,
  [aria-disabled="true"]{
    cursor:not-allowed;
  }

  a[href],
  button,
  summary,
  [role="button"],
  [role="link"],
  [data-clickable="true"]{
    transition:
      color .16s ease,
      background-color .16s ease,
      border-color .16s ease,
      box-shadow .16s ease,
      opacity .16s ease,
      transform .16s ease;
  }

  a[href]:hover,
  button:not(:disabled):hover,
  summary:hover,
  [role="button"]:not([aria-disabled="true"]):hover,
  [role="link"]:not([aria-disabled="true"]):hover,
  [data-clickable="true"]:not([aria-disabled="true"]):hover{
    opacity:.88;
  }

  a[href]:active,
  button:not(:disabled):active,
  summary:active,
  [role="button"]:not([aria-disabled="true"]):active,
  [role="link"]:not([aria-disabled="true"]):active,
  [data-clickable="true"]:not([aria-disabled="true"]):active{
    transform:translateY(1px);
  }

  a[href]:focus-visible,
  button:focus-visible,
  summary:focus-visible,
  select:focus-visible,
  input[type="button"]:focus-visible,
  input[type="submit"]:focus-visible,
  input[type="reset"]:focus-visible,
  input[type="checkbox"]:focus-visible,
  input[type="radio"]:focus-visible,
  [role="button"]:focus-visible,
  [role="link"]:focus-visible,
  [data-clickable="true"]:focus-visible{
    outline:3px solid rgba(13,91,225,.32);
    outline-offset:3px;
  }

  button:disabled,
  [aria-disabled="true"]{
    opacity:.55;
  }
}`;

if (source.includes(marker)) {
  source = source.replace(marker, replacement);
} else if (!source.includes('cursor:pointer;')) {
  throw new Error(
    "Could not locate Enorsis global base-style anchor. Inspect src/app/globals.css before applying.",
  );
}

fs.writeFileSync(path, source);

console.log(
  "B13.10.11 global interactive cursor and affordance integration complete.",
);
