#!/usr/bin/env node
// Dependency audit gate (handbook quality-gates.md). Fails on any known vulnerability in the
// locked dependencies, except a dev-only advisory listed in scripts/audit-allowlist.json whose
// review-by date has not passed. A listed advisory that shows up in production dependencies
// fails regardless. No dependencies of its own: it only reads `npm audit --json`.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

function audit(args) {
  let out;
  try {
    out = execFileSync("npm", ["audit", "--json", ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
    out = err.stdout;
  }
  let report;
  try {
    report = JSON.parse(out);
  } catch {
    throw new Error(
      "npm audit did not return JSON (is the registry reachable?)",
    );
  }
  if (report.error)
    throw new Error(
      `npm audit failed: ${report.error.summary ?? "unknown error"}`,
    );
  const found = new Map();
  for (const vuln of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vuln.via) {
      if (typeof via === "string") continue; // a transitive path; the advisory itself is listed under its own package
      const id = via.url?.split("/").pop() ?? String(via.source);
      found.set(id, {
        package: via.name,
        severity: via.severity,
        title: via.title,
        url: via.url,
      });
    }
  }
  return found;
}

const allowlist = JSON.parse(
  readFileSync(new URL("./audit-allowlist.json", import.meta.url), "utf8"),
);
const allowed = new Map(allowlist.advisories.map((a) => [a.id, a]));
const today = new Date().toISOString().slice(0, 10);

const all = audit([]);
const prod = audit(["--omit=dev"]);
const failures = [];

for (const [id, adv] of all) {
  const entry = allowed.get(id);
  const label = `${id} ${adv.package} (${adv.severity}): ${adv.title}`;
  if (!entry) failures.push(label);
  else if (prod.has(id))
    failures.push(
      `${label} [allowlisted as dev-only, but reaches a production dependency]`,
    );
  else if (entry.reviewBy < today)
    failures.push(
      `${label} [allowlist review date ${entry.reviewBy} has passed]`,
    );
  else console.log(`allowed until ${entry.reviewBy}: ${label}`);
}

for (const id of allowed.keys()) {
  if (!all.has(id))
    console.log(
      `note: ${id} is allowlisted but no longer reported; remove it from scripts/audit-allowlist.json`,
    );
}

if (failures.length) {
  console.error("dependency audit failed:");
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log("dependency audit clean");
