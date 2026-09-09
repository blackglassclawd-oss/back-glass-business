/** Read-only: no mutation, publication, upload or redirect-write mode. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { ShopifyAdminClient } from "../app/services/shopify/admin.server";
import { loadShopifyConfig } from "../app/services/shopify/config";
import type { StorefrontProduct } from "../app/data/catalog.shared";
import { getProductInformation, productInformationHtml, productDescription, escapeHtml, PRODUCT_FACTS_METAFIELD, ownerReviewedDefaults } from "../app/data/product-information";
import { collectionDefinitions, collectionContentReview } from "../app/data/collection-content";
import { buyerGuidance, guidanceHtml } from "../app/data/buyer-guidance";
import { storefrontPositioning } from "../app/data/store-content";
import { supportReview } from "../app/data/support-content";
import { buildRedirectDecisions } from "../app/data/redirect-decisions";
import { planThemeChanges } from "./lib/seo-theme-plan";
import { planProductDescription } from "./lib/seo-content-plan";

const arguments_ = process.argv.slice(2);
if (arguments_.some(a => !a.startsWith("--output="))) throw new Error("Only --output= is supported. This command cannot apply changes.");
const output = resolve(arguments_.find(a => a.startsWith("--output="))?.slice(9) ?? "output/seo-geo-plan.json");
const config = loadShopifyConfig(process.env);
if (config.storeDomain !== "kfczyu-kc.myshopify.com") throw new Error("Unexpected Shopify store; refusing to proceed.");
const client = new ShopifyAdminClient(config);
interface LiveProduct {
  id: string; handle: string; title: string; productType: string; tags: string[]; status: string; onlineStoreUrl: string | null;
  descriptionHtml: string; seo: { title: string | null; description: string | null }; metafield: { value: string } | null;
  variants: { pageInfo: { hasNextPage: boolean }; nodes: Array<{ id: string; title: string; sku: string | null; selectedOptions: Array<{ name: string; value: string }> }> };
}
const products: LiveProduct[] = []; let after: string | null = null;
do {
  const data: { products: { nodes: LiveProduct[]; pageInfo: { hasNextPage: boolean; endCursor: string } } } = await client.query(`query SeoProducts($after:String){ products(first:50,after:$after){ pageInfo{hasNextPage endCursor} nodes{id handle title productType tags status onlineStoreUrl descriptionHtml seo{title description} metafield(namespace:"bgp",key:"product_information"){value} variants(first:100){pageInfo{hasNextPage} nodes{id title sku selectedOptions{name value}}}}}}`, { after });
  products.push(...data.products.nodes); after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
} while (after);
if (products.some(p => p.variants.pageInfo.hasNextPage)) throw new Error("Variant pagination exceeds adapter limit; refusing a partial plan.");
interface Collection { id: string; handle: string; title: string; descriptionHtml: string; seo: { title: string | null; description: string | null }; onlineStoreUrl: string | null }
interface Page { id: string; handle: string; title: string; isPublished: boolean; body: string | null }
const collections: Collection[] = []; const pages: Page[] = []; const redirects: Array<{ path: string; target: string }> = [];
for (const key of ["collections", "pages", "urlRedirects"] as const) {
  let cursor: string | null = null;
  do {
    const fields = key === "collections" ? "id handle title descriptionHtml seo{title description}" : key === "pages" ? "id handle title isPublished body" : "path target";
    const data: Record<string, { nodes: unknown[]; pageInfo: { hasNextPage: boolean; endCursor: string } }> = await client.query(`query SeoResources($after:String){${key}(first:100,after:$after){pageInfo{hasNextPage endCursor} nodes{${fields}}}}`, { after: cursor });
    if (key === "collections") collections.push(...data[key].nodes as Collection[]);
    else if (key === "pages") pages.push(...data[key].nodes as Page[]);
    else redirects.push(...data[key].nodes as Array<{ path: string; target: string }>);
    cursor = data[key].pageInfo.hasNextPage ? data[key].pageInfo.endCursor : null;
  } while (cursor);
}
for (const collection of collections) {
  const url = `https://backglasspros.com/collections/${collection.handle}`;
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20000) });
  collection.onlineStoreUrl = response.status === 200 ? url : null;
  await response.body?.cancel();
}
const productPlans = products.filter(p => p.status === "ACTIVE" && p.onlineStoreUrl && !/full assembly/i.test(p.title)).map(p => {
  let supplement: unknown; try { supplement = p.metafield ? JSON.parse(p.metafield.value) : undefined; } catch { supplement = { invalid: true }; }
  const input = { handle: p.handle, title: p.title, product_type: p.productType, tags: p.tags,
    options: [{ name: "Color", position: 1, values: [...new Set(p.variants.nodes.flatMap(v => v.selectedOptions.filter(o => /^colou?r$/i.test(o.name)).map(o => o.value)))] }].filter(o => o.values.length),
    variants: p.variants.nodes.map(v => ({ id: Number(v.id.split("/").at(-1)), title: v.title, sku: v.sku ?? "" })) } as StorefrontProduct;
  const facts = getProductInformation(input, supplement, "Live Shopify catalog");
  const block = productInformationHtml(facts);
  const category = facts.partType === "half-assembly" ? "half-assembly-without-charging-coil" : facts.partType === "glass-only" ? "glass-only" : "wireless-charging-coils";
  const collection = collections.find(c => c.handle === category && c.onlineStoreUrl);
  const related = collection ? `<p data-bgp-related-collection="1"><a href="/collections/${category}">Browse ${escapeHtml(collection.title)}</a></p>` : "";
  const body = block ? block + related : null;
  const descriptionPlan = planProductDescription(p.descriptionHtml, body);
  const blockers = [...facts.issues, ...descriptionPlan.blockers];
  // When seo.title is blank Shopify already renders product.title, so writing
  // product.title into the seo.title field changes no rendered output. Marking
  // these as proposals inflated the approval queue with 54 no-ops.
  const candidateSeo = { title: p.title, description: productDescription(facts) };
  const renderedSeoTitle = p.seo.title?.trim() || p.title;
  const seoTitleIsNoop = candidateSeo.title === renderedSeoTitle;
  const seoDescriptionIsNoop = (p.seo.description ?? null) === candidateSeo.description;
  return { id: p.id, handle: p.handle, sourceSha256: createHash("sha256").update(JSON.stringify(p)).digest("hex"), blockers,
    reviewCandidate: { existingDescriptionHtml: descriptionPlan.existingDescriptionHtml, candidateInformationHtml: descriptionPlan.candidateInformationHtml, existingSeo: p.seo, candidateSeo },
    seoFieldEffect: { title: seoTitleIsNoop ? "already-equivalent" : "rendered-change", description: seoDescriptionIsNoop ? "already-equivalent" : "rendered-change", renderedSeoTitle },
    proposal: descriptionPlan.descriptionHtml && !blockers.length ? { descriptionHtml: descriptionPlan.descriptionHtml, seo: candidateSeo } : null,
    unknownFacts: { includedComponents: facts.includedComponents === null, compatibility: facts.compatibleCoilHandles.length === 0 },
    // Variant colors and SKUs are consumed directly; never rewritten by this plan.
    variantCount: p.variants.nodes.length,
  };
});
const collectionPlans = Object.entries(collectionDefinitions).map(([handle, content]) => {
  const existing = collections.find(c => c.handle === handle);
  const links = content.related.filter(h => collections.some(c => c.handle === h && c.onlineStoreUrl));
  const isPublic = Boolean(existing?.onlineStoreUrl);
  // Only a published collection whose copy actually differs is a shippable
  // change. Unpublished or nonexistent collections are out of ship-now scope:
  // editing them changes nothing a visitor or crawler can see.
  const shipNow = isPublic && (existing!.seo.description ?? "") !== content.description;
  return { handle, id: existing?.id ?? null, action: existing ? "update-proposal" : "creation-requires-review", public: isPublic, shipNow,
    sourceSha256: existing ? createHash("sha256").update(JSON.stringify({ id: existing.id, handle: existing.handle, title: existing.title, descriptionHtml: existing.descriptionHtml, seo: existing.seo })).digest("hex") : null,
    existingContent: existing ? { descriptionHtml: existing.descriptionHtml, seo: existing.seo } : null,
    review: collectionContentReview,
    blockers: ["collection-owner-approval-required", ...(existing?.descriptionHtml.trim() ? ["existing-collection-description-needs-merge-review"] : [])],
    proposal: { descriptionHtml: `<p>${escapeHtml(content.description)}</p><ul>${links.map(h => `<li><a href="/collections/${h}">${escapeHtml(collectionDefinitions[h].title)}</a></li>`).join("")}</ul>`, seo: { title: content.title, description: content.description } },
    preserveRulesAndMembership: true,
  };
});
// Theme reads use the existing client-credentials flow, never a storefront mutation.
const tokenResponse = await fetch(`https://${config.storeDomain}/admin/oauth/access_token`, { method: "POST", body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, grant_type: "client_credentials" }) });
const token = await tokenResponse.json() as { access_token?: string };
if (!token.access_token) throw new Error("Theme read authentication failed.");
async function rest(path: string) {
  const response = await fetch(`https://${config.storeDomain}/admin/api/${config.apiVersion}${path}`, { headers: { "X-Shopify-Access-Token": token.access_token! } });
  if (!response.ok) throw new Error(`Theme read HTTP ${response.status}`);
  return response.json();
}
const themes = await rest("/themes.json") as { themes: Array<{ id: number; role: string }> };
const mainThemes = themes.themes.filter(t => t.role === "main");
if (mainThemes.length !== 1) throw new Error("Expected one production theme.");
const theme = mainThemes[0];
const assets: Record<string, string> = {};
for (const key of ["templates/product.json", "templates/index.json", "sections/main-product.liquid", "sections/header.liquid", "sections/header-group.json", "sections/footer.liquid", "sections/email-signup-banner.liquid", "layout/theme.liquid"]) {
  const response = await rest(`/themes/${theme.id}/assets.json?asset%5Bkey%5D=${encodeURIComponent(key)}`) as { asset: { value: string } };
  assets[key] = response.asset.value;
}
const newAssets: Record<string, string> = {};
for (const name of ["bgp-product-schema", "bgp-organization-schema", "bgp-breadcrumb-schema", "bgp-support-links"]) newAssets[`snippets/${name}.liquid`] = await readFile(`shopify/snippets/${name}.liquid`, "utf8");
newAssets["sections/bgp-introduction.liquid"] = `<section class="page-width"><h1>${escapeHtml(storefrontPositioning.heading)}</h1><p>${escapeHtml(storefrontPositioning.introduction)}</p><nav aria-label="Browse parts"><ul>${storefrontPositioning.importantCollections.map(h => `{% if collections['${h}'] != blank %}<li><a href="{{ collections['${h}'].url }}">${escapeHtml(collectionDefinitions[h].title)}</a></li>{% endif %}`).join("")}</ul></nav></section>\n{% schema %}{"name":"BGP product introduction","settings":[]}{% endschema %}\n`;
// A collapsible tab pointing at a missing or empty Page still renders empty.
const pagesWithContent = new Set(pages.filter(p => p.isPublished && (p.body ?? "").replace(/<[^>]*>/g, "").trim()).map(p => p.handle));
const themePlan = planThemeChanges(assets, newAssets, pagesWithContent);
const repeatThemePlan = planThemeChanges({ ...assets, ...Object.fromEntries(themePlan.changes.map(change => [change.key, change.value])) }, newAssets, pagesWithContent);
if (repeatThemePlan.changes.length) themePlan.blockers.push("theme-transform-not-idempotent");
const redirectPlan = buildRedirectDecisions(products, redirects);
const redirectHealth: Array<{ path: string; sourceStatus: number; targetStatus: number | null; location: string | null }> = [];
for (const decision of redirectPlan) {
  // Shopify can redirect HEAD requests for missing products while GET returns 404.
  // Validate the actual page request without following redirects or retaining bodies.
  const source = await fetch(`https://backglasspros.com${decision.path}`, { redirect: "manual", signal: AbortSignal.timeout(20000) });
  await source.body?.cancel();
  const location = source.headers.get("location");
  let targetStatus: number | null = null;
  if (decision.target && decision.target.startsWith("/") && !decision.target.startsWith("//") && !/[?#]/.test(decision.target)) {
    const target = await fetch(`https://backglasspros.com${decision.target}`, { redirect: "manual", signal: AbortSignal.timeout(20000) });
    targetStatus = target.status;
    await target.body?.cancel();
  }
  redirectHealth.push({ path: decision.path, sourceStatus: source.status, targetStatus, location });
  const exactLegacyTarget = "/products/iphone-16-pro-max-half-assembly-no-coil-premium";
  const legacyMismatch = decision.path.endsWith("half-assembly-no-coil-a-grade-copy") && (decision.target !== exactLegacyTarget || !products.some(p => `/products/${p.handle}` === exactLegacyTarget && p.status === "ACTIVE"));
  const healthyExisting = decision.decision === "existing" && source.status === 301 && targetStatus === 200 && location && new URL(location, "https://backglasspros.com").href === `https://backglasspros.com${decision.target}`;
  const healthyProposal = decision.decision === "propose-301" && source.status === 404 && targetStatus === 200;
  const healthy404 = decision.decision === "retain-404" && source.status === 404;
  if (legacyMismatch || (!healthyExisting && !healthyProposal && !healthy404)) decision.decision = "review-required";
  decision.reason += ` Live source/target HTTP ${source.status}/${targetStatus ?? "not applicable"}.`;
}
const plan = { version: 1, capturedAt: new Date().toISOString(), mode: "READ_ONLY_PROPOSAL", store: config.storeDomain,
  writesToShopify: 0,
  ownerReviewedDefaults,
  approvalsRequired: ["Michael: product facts and content", "Jason: publication and redirects"], metafieldContract: PRODUCT_FACTS_METAFIELD,
  liveSummary: { products: products.length, active: products.filter(p => p.status === "ACTIVE").length, coils: products.filter(p => p.productType === "Wireless Charging Coil").map(p => ({ handle: p.handle, status: p.status, public: Boolean(p.onlineStoreUrl), titleAnomaly: /OEM.*OEM/.test(p.title) })), collections: collections.map(c => ({ handle: c.handle, public: Boolean(c.onlineStoreUrl) })) },
  // Separates what actually changes rendered output from what only looks like a change.
  shipNowSummary: {
    themeChanges: themePlan.changes.map(c => c.key),
    publicCollectionUpdates: collectionPlans.filter(c => c.shipNow).map(c => c.handle),
    productSeoTitlesAlreadyEquivalent: productPlans.filter(p => p.seoFieldEffect.title === "already-equivalent").length,
    productSeoTitlesRenderedChange: productPlans.filter(p => p.seoFieldEffect.title === "rendered-change").length,
    deferred: ["54 product-description merges", "4 buyer-guidance pages", "28 retired-URL redirects", "coil publication", "back-glass collection creation"],
  },
  excludedActiveProducts: products.filter(p => p.status === "ACTIVE" && (!p.onlineStoreUrl || /full assembly/i.test(p.title))).map(p => ({ handle: p.handle, reason: !p.onlineStoreUrl ? "No Online Store URL; ACTIVE does not imply Online Store publication." : "Retired full-assembly title; excluded by policy." })),
  products: productPlans, collections: collectionPlans,
  pages: Object.entries(buyerGuidance).map(([handle, p]) => ({ handle, existingId: pages.find(page => page.handle === handle)?.id ?? null, isPublished: false, title: p.title, body: guidanceHtml(handle), reviewStatus: p.status, blockers: p.status === "OWNER_REVIEWED_PUBLICATION_PENDING" ? ["Jason exact wording and publication approval required"] : ["Michael unresolved technical facts required", "Jason publication approval required"], seo: { title: p.title, description: p.description } })),
  redirects: redirectPlan, redirectHealth, theme: { id: theme.id, idempotent: repeatThemePlan.changes.length === 0, ...themePlan }, trust: supportReview,
};
await mkdir(dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(plan, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify({ output, active: plan.liveSummary.active, productProposals: productPlans.filter(p => p.proposal).length, blockedProducts: productPlans.filter(p => !p.proposal).length, coilDrafts: plan.liveSummary.coils.length, redirectDecisions: redirectPlan.length, themeChanges: themePlan.changes.length, themeBlockers: themePlan.blockers, shipNow: plan.shipNowSummary, writesToShopify: 0 }, null, 2));
