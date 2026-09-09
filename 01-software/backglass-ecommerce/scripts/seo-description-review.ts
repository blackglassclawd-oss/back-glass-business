/** Generate an internal review artifact from the read-only live plan; no Shopify writes. */
import { readFile, writeFile } from "node:fs/promises";
import { load } from "cheerio";
import { ownerReviewedDefaults } from "../app/data/product-information";
const plan = JSON.parse(await readFile("/private/tmp/bgp-shopify-seo-geo-plan.json", "utf8"));
if (plan.writesToShopify !== 0 || plan.ownerReviewedDefaults?.evidenceId !== ownerReviewedDefaults.evidenceId) throw Error("Regenerate the read-only plan with current owner evidence first");
const handles = [
  "iphone-8-large-hole-back-glass-premium",
  "iphone-11-large-hole-back-glass-a-grade",
  "iphone-14-pro-max-large-hole-back-glass-premium",
  "iphone-14-pro-max-large-hole-back-glass-a-grade",
  "iphone-16-pro-half-assembly-no-coil-premium",
  "iphone-16-pro-half-assembly-no-coil-a-grade",
];
const rows = handles.map(handle => {
  const p = plan.products.find((p: { handle: string }) => p.handle === handle);
  if (!p?.reviewCandidate?.candidateInformationHtml) throw Error(`Missing review candidate: ${handle}`);
  return p;
});
const plain = (html: string) => load(html.replace(/<\/(p|h2|dt|dd|li)>/g, "$& ")).text().replace(/\s+/g, " ").trim();
const content = `# Description Review — Batch 1\n\nRegenerated from Shopify read-only plan captured ${plan.capturedAt}.\nOwner evidence: ${ownerReviewedDefaults.evidenceId}. Six representative public\nproducts across glass-only, half-assembly, Premium/A Grade and generations.\nNo coil drafts, product writes or publication are included.\n\n## Already resolved — do not reconfirm\n\n- Premium: one-piece formed glass.\n- A Grade: two glass layers in the raised 3D portion.\n- Literal contents: glass only; half assembly without wireless charging coil; coil only.\n- No durability, fit-performance, coating, material-origin or Apple/OEM claims added.\n- Detailed half-assembly BOM and coil compatibility remain unestablished.\n\n## Decision instructions\n\nMichael: flag only a concrete SKU exception or a conflict in existing merchant\ncopy. If there is no exception, no repeat answer to Q1/Q2 is requested.\nJason: approve/reject each exact merge (existing HTML retained, candidate block\nappended) and SEO fields separately. These are review artifacts, not eligible\nautomatic replacements. Source drift requires re-review. All six remain pending.\n\n` + rows.map((p, i) => {
  const r = p.reviewCandidate;
  const merged = `${r.existingDescriptionHtml}\n${r.candidateInformationHtml}`;
  if (merged.includes("```")) throw Error("Unexpected markdown fence in merchant content");
  return `## ${i + 1}. ${p.handle}\n\nSource SHA-256: \`${p.sourceSha256}\`\n\nExisting copy: ${plain(r.existingDescriptionHtml)}\n\nProposed information: ${plain(r.candidateInformationHtml)}\n\nProposed SEO title: ${r.candidateSeo.title}\n\nProposed SEO description: ${r.candidateSeo.description}\n\nExact proposed merged HTML (existing content preserved):\n\n\`\`\`html\n${merged}\n\`\`\`\n\nMichael — specific exception/conflict only: ______\n\nJason — exact merge and SEO decision: PENDING\n`;
}).join("\n");
await writeFile("docs/SEO_GEO_DESCRIPTION_REVIEW_BATCH_1.md", content);
console.log("Generated six review items; writesToShopify=0; Q1/Q2 not requested again.");
