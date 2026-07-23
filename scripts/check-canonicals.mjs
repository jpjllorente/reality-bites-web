#!/usr/bin/env node
// Guardrail: fails if any route file declares more than one `rel: "canonical"` link,
// or if a parent (layout) route emits a canonical (which would be inherited by children).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROUTES_DIR = "src/routes";
const errors = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(name)) check(p);
  }
}

function check(file) {
  const src = readFileSync(file, "utf8");
  const matches = src.match(/rel:\s*["']canonical["']/g) ?? [];
  if (matches.length > 1) {
    errors.push(`${file}: ${matches.length} canonical links declared (must be at most 1).`);
  }
  // Parent/layout routes rendering <Outlet /> must NOT declare a canonical,
  // because TanStack concatenates `links` into every child match.
  const isLayout = /<Outlet\s*\/?>/i.test(src) && !/\.index\.(tsx|ts)$/.test(file) && !file.endsWith("__root.tsx");
  if (isLayout && matches.length > 0) {
    errors.push(`${file}: layout route must not declare rel="canonical" (leaks into children).`);
  }
}

walk(ROUTES_DIR);

if (errors.length) {
  console.error("Canonical check failed:\n" + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}
console.log("Canonical check OK.");
