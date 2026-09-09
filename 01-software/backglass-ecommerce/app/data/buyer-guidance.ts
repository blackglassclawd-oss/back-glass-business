import { coilCatalogModels } from "./product-taxonomy";
import { escapeHtml, ownerReviewedDefaults } from "./product-information";

export interface GuidancePage {
  title: string;
  description: string;
  status: "FACTUAL_REVIEW_REQUIRED" | "OWNER_REVIEWED_PUBLICATION_PENDING";
  owner: "Michael";
  source: string;
  reviewAfter: string;
  sections: Array<{ question: string; answer: string | null; reviewQuestion?: string }>;
  related: string[];
}
const review = { status: "FACTUAL_REVIEW_REQUIRED", owner: "Michael", source: "10-knowledge/CATALOG.md; existing coil model matrix", reviewAfter: "2026-12-08" } as const;
export const buyerGuidance: Record<string, GuidancePage> = {
  "premium-vs-a-grade": {
    ...review, status: "OWNER_REVIEWED_PUBLICATION_PENDING", source: ownerReviewedDefaults.evidenceId, title: "Premium vs A Grade iPhone Back Glass",
    description: "Premium uses one-piece formed glass; A Grade uses two layers in the raised three-dimensional portion. Compare the owner-confirmed construction distinction.",
    sections: [
      { question: "What do Premium and A Grade mean in this catalog?", answer: "Premium and A Grade are separate back-glass catalog labels. Product listings identify the phone model, part type and available variants." },
      { question: "How does the glass construction differ?", answer: `${ownerReviewedDefaults.construction.Premium} ${ownerReviewedDefaults.construction["A Grade"]}` },
      { question: "Does this establish performance or Apple authenticity?", answer: "No. The construction distinction does not establish durability, fit performance, coatings, color accuracy, service life, or Apple/OEM origin." },
    ], related: ["/collections/premium", "/collections/a-grade", "/pages/glass-only-vs-half-assembly"],
  },
  "glass-only-vs-half-assembly": {
    ...review, status: "OWNER_REVIEWED_PUBLICATION_PENDING", source: ownerReviewedDefaults.evidenceId, title: "Glass Only vs Half Assembly",
    description: "Understand the catalog distinction between glass-only listings and half assemblies without charging coils, and check model and component information before ordering.",
    sections: [
      { question: "How are these products categorized?", answer: "The Glass Only category contains large-hole back-glass listings. Half-assembly products explicitly labeled No Coil exclude the wireless charging coil. Match the exact model and listed variant." },
      { question: "What do the package labels mean?", answer: "Glass Only means glass only. Half Assembly — No Coil means a half assembly without the wireless charging coil. Wireless Charging Coil means coil only. No detailed half-assembly component list or additional accessories are established by these labels." },
    ], related: ["/collections/glass-only", "/collections/half-assembly-without-charging-coil", "/pages/wireless-charging-coil-compatibility"],
  },
  "wireless-charging-coil-compatibility": {
    ...review, title: "Wireless Charging Coil Compatibility by iPhone Model",
    description: "Review standalone wireless charging coil model mappings separately from verified compatibility. Current coil drafts are unavailable pending factual review.",
    sections: [
      { question: "Are coils included with the half assemblies?", answer: "Products labeled Half Assembly (No Coil) exclude the wireless charging coil. Coils are listed separately; retired full assemblies are not an alternative catalog strategy." },
      { question: "Does a matching model name prove compatibility?", answer: "No. The existing matrix records intended model mappings. Coil compatibility and the OEM/Aftermarket labels remain subject to review. Coil-only contents are owner confirmed, but no current draft should be treated as a verified compatible purchase." },
      { question: "Which model-specific compatibility details must be verified?", answer: null, reviewQuestion: "Michael: verify each coil against its exact phone model and any regional or configuration limitations, supported by a public-safe source reference. No cross-model substitutions are established." },
    ], related: ["/collections/wireless-charging-coils", "/collections/half-assembly-without-charging-coil"],
  },
  "inspect-replacement-back-glass": {
    ...review, title: "How to Inspect Replacement Back Glass Before Installation",
    description: "An inspection-guide draft awaiting Michael's verified checks, acceptance criteria and evidence. No installation or repair procedure is asserted.",
    sections: [
      { question: "Which pre-installation checks should a repair shop perform?", answer: null, reviewQuestion: "Michael: supply the verified inspection sequence, handling precautions, acceptance criteria and examples." },
      { question: "What should happen if a part fails inspection?", answer: null, reviewQuestion: "Michael and Jason: confirm the support route and approved defect/RMA policy before writing instructions." },
    ], related: ["/pages/contact", "/collections/glass-only", "/collections/half-assembly-without-charging-coil"],
  },
};

export function guidanceHtml(slug: string) {
  const page = buyerGuidance[slug];
  if (!page) return null;
  return `<p><strong>${page.status === "OWNER_REVIEWED_PUBLICATION_PENDING" ? "Draft — construction and product-label facts reviewed by Michael. Publication approval remains pending." : "Draft — unresolved technical facts require Michael's review. Not approved for publication."}</strong></p>` +
    page.sections.map(s => `<section><h2>${escapeHtml(s.question)}</h2><p>${escapeHtml(s.answer ?? `Requires factual review: ${s.reviewQuestion}`)}</p></section>`).join("") +
    (slug === "wireless-charging-coil-compatibility" ? `<h2>Recorded model mappings — not confirmed compatibility</h2><table><caption>All listed coils remain unavailable drafts</caption><thead><tr><th>Family</th><th>Model</th><th>Compatibility</th></tr></thead><tbody>${coilCatalogModels.map(m => `<tr><td>${escapeHtml(m.family)}</td><td>${escapeHtml(m.model)}</td><td>Requires Michael's verification</td></tr>`).join("")}</tbody></table><p>No coil relationship is established for iPhone 16e, iPhone 14 Pro or iPhone 14 Pro Max.</p>` : "") +
    `<h2>Related information</h2><ul>${page.related.map(path => `<li><a href="${path}">${escapeHtml(path.split("/").at(-1)!.replaceAll("-", " "))}</a></li>`).join("")}</ul>`;
}
