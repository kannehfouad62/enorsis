#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const componentRoots = [
  path.join(root, "src/components"),
  path.join(root, "src/app"),
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (!/\.(tsx|ts|jsx|js)$/.test(entry.name)) return [];
    return [full];
  });
}

const files = componentRoots.flatMap(walk);

const headerCandidates = files.filter((file) => {
  const source = fs.readFileSync(file, "utf8");
  return (
    source.includes('href="/pricing"') &&
    (source.includes('href="/about"') || source.includes('href="/platform"'))
  );
});

const footerCandidates = files.filter((file) => {
  const source = fs.readFileSync(file, "utf8");
  return (
    source.includes('href="/careers"') ||
    source.includes('href="/resources/guides"') ||
    source.includes('href="/resources/publications"')
  );
});

let headerUpdated = false;
for (const file of headerCandidates) {
  let source = fs.readFileSync(file, "utf8");

  if (source.includes('href="/contact"')) continue;

  const anchors = [
    '<Link href="/pricing"',
    '<a href="/pricing"',
  ];

  const anchor = anchors.find((value) => source.includes(value));
  if (!anchor) continue;

  const lineStart = source.lastIndexOf("\n", source.indexOf(anchor)) + 1;
  const lineEnd = source.indexOf("\n", source.indexOf(anchor));
  const line = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd);
  const indent = line.match(/^\s*/)?.[0] ?? "";

  const insertion = `${indent}<Link href="/contact">Contact Us</Link>\n`;
  const insertAt = lineEnd === -1 ? source.length : lineEnd + 1;
  source = source.slice(0, insertAt) + insertion + source.slice(insertAt);
  fs.writeFileSync(file, source);
  console.log(`Added Contact Us to header/navigation: ${path.relative(root, file)}`);
  headerUpdated = true;
  break;
}

let footerUpdated = false;
for (const file of footerCandidates) {
  let source = fs.readFileSync(file, "utf8");

  if (
    source.includes('href="/privacy"') &&
    source.includes('href="/terms"') &&
    source.includes('href="/cookies"') &&
    source.includes('href="/accessibility"') &&
    source.includes('href="/contact"')
  ) {
    footerUpdated = true;
    break;
  }

  const closeMarkers = ["</footer>", "</Footer>"];
  const marker = closeMarkers.find((value) => source.includes(value));
  if (!marker) continue;

  const links = `
        <div className="footer-legal-links">
          <Link href="/contact">Contact Us</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/accessibility">Accessibility</Link>
        </div>
`;

  source = source.replace(marker, `${links}${marker}`);
  fs.writeFileSync(file, source);
  console.log(`Added Contact + legal links to footer: ${path.relative(root, file)}`);
  footerUpdated = true;
  break;
}

if (!headerUpdated) {
  console.warn("Could not automatically identify a header/navigation file. Contact page is created, but header link may require manual placement.");
}

if (!footerUpdated) {
  console.warn("Could not automatically identify a footer file. Legal/contact pages are created, but footer links may require manual placement.");
}

console.log("Public legal/contact navigation installation complete.");
