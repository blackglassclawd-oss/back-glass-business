import { readFile } from "node:fs/promises";
import { catalog, customerVisibleProducts } from "../app/data/catalog.server";
import { coilDraftProducts } from "../app/data/product-taxonomy";
import { collectionDefinitions } from "../app/data/collection-content";
import { buyerGuidance } from "../app/data/buyer-guidance";
import { buildRedirectDecisions } from "../app/data/redirect-decisions";
import { auditHtml, auditProduct, type Finding } from "../app/data/seo-quality";
import { getProductInformation, productInformationHtml } from "../app/data/product-information";

const args = process.argv.slice(2);
const base = args.find(x => x.startsWith("--base="))?.slice(7);
const planPath = args.find(x => x.startsWith("--plan="))?.slice(7);
const findings: Finding[] = [];
const decisions = buildRedirectDecisions(catalog.products);
let redirectDecisionCount = decisions.length;
for (const product of customerVisibleProducts) {
  const f = getProductInformation(product);
  findings.push(...auditProduct({ ...product, body_html: productInformationHtml(f) ?? product.body_html }));
}
for (const [slug, definition] of Object.entries(collectionDefinitions)) {
  if (definition.description.trim().length < 100) findings.push({ severity: "error", code: "missing-collection-introduction", path: `/collections/${slug}`, detail: "Collection needs useful introductory text." });
}
for (const p of catalog.products.filter(p => /full assembly/i.test(p.title))) {
  if (!decisions.some(d => d.path === `/products/${p.handle}`)) findings.push({ severity: "error", code: "retired-without-decision", path: `/products/${p.handle}`, detail: "Retired product needs a documented URL decision." });
}
for (const p of coilDraftProducts) {
  if (p.compatibility !== null || p.handle || p.price !== null) findings.push({ severity: "error", code: "draft-publication-leak", path: p.modelSlug, detail: "Draft matrix must not imply approved commerce or compatibility." });
}
if (planPath) {
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  redirectDecisionCount = plan.redirects?.length ?? 0;
  if (plan.writesToShopify !== 0 || plan.mode !== "READ_ONLY_PROPOSAL") findings.push({ severity: "error", code: "plan-not-read-only", path: planPath, detail: "Expected an explicit zero-write proposal." });
  for (const code of plan.theme?.blockers ?? []) findings.push({ severity: "warning", code, path: "theme", detail: "Theme review required." });
  for (const p of plan.pages ?? []) if (p.blockers?.length) findings.push({ severity: "warning", code: p.reviewStatus === "OWNER_REVIEWED_PUBLICATION_PENDING" ? "guidance-publication-required" : "guidance-review-required", path: `/pages/${p.handle}`, detail: p.reviewStatus === "OWNER_REVIEWED_PUBLICATION_PENDING" ? "Bounded facts are owner reviewed; exact wording/publication approval remains pending." : "Unresolved technical guidance remains unpublished." });
  for (const r of plan.redirects ?? []) if (r.decision === "review-required") findings.push({ severity: "warning", code: "redirect-review-required", path: r.path, detail: r.reason });
  for (const p of plan.products ?? []) {
    for (const code of p.blockers ?? []) findings.push({ severity: "warning", code, path: `/products/${p.handle}`, detail: "Shopify proposal requires review before publication." });
  }
  for (const r of plan.redirects ?? []) if (r.target && (r.target.includes("?") || r.target === r.path)) findings.push({ severity: "error", code: "invalid-redirect", path: r.path, detail: "Redirect must be canonical and non-circular." });
}
if (base) {
  const origin = new URL(base).origin;
  const queue = ["/", ...Object.keys(collectionDefinitions).map(s => `/collections/${s}`), ...Object.keys(buyerGuidance).map(s => `/pages/${s}`), "/pages/buyer-guidance", "/pages/support-review", ...customerVisibleProducts.map(p => `/products/${p.handle}`)];
  const seen = new Set<string>(); const titles = new Map<string, string>();
  while (queue.length) {
    const path = queue.shift()!;
    if (seen.has(path)) continue;
    seen.add(path);
    if (seen.size > 400) throw new Error("Crawl limit exceeded; check link traps.");
    const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(20000), redirect: "manual" });
    if (response.status >= 300 && response.status < 400) {
      const destination = new URL(response.headers.get("location") ?? path, origin);
      if (destination.origin === origin) queue.push(destination.pathname);
      continue;
    }
    if (!response.ok) { findings.push({ severity: "error", code: "broken-internal-link", path, detail: `HTTP ${response.status}` }); continue; }
    const result = auditHtml(await response.text(), path); findings.push(...result.findings);
    if (titles.has(result.title) && titles.get(result.title) !== path) findings.push({ severity: "warning", code: "duplicate-title", path, detail: `Same title as ${titles.get(result.title)}` });
    titles.set(result.title, path);
    for (const link of result.links) {
      const url = new URL(link, origin);
      if (!url.search && /^\/(?:products|collections|pages|models)(?:\/|$)/.test(url.pathname)) queue.push(url.pathname);
    }
  }
  console.log(`Rendered crawl: ${seen.size} routes checked.`);
}
const counts = findings.reduce<Record<string, number>>((a, f) => (a[f.code] = (a[f.code] ?? 0) + 1, a), {});
console.log(JSON.stringify({ mode: base ? "rendered-preview" : planPath ? "shopify-plan" : "deterministic-catalog", products: customerVisibleProducts.length, coilDrafts: coilDraftProducts.length, redirectDecisions: redirectDecisionCount, errors: findings.filter(f => f.severity === "error").length, warnings: findings.filter(f => f.severity === "warning").length, counts, findings: args.includes("--details") ? findings : findings.filter(f => f.severity === "error") }, null, 2));
if (findings.some(f => f.severity === "error") || (args.includes("--strict") && findings.length)) process.exitCode = 1;
