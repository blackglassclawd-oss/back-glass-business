import premiumPlusGradeJson from "../../data/catalog/premium-plus-grade-2026-09-09.json";
import type { StorefrontProduct } from "./catalog.shared";
import { getModelFamily, getModelSlug, normalizeModelName } from "./product-taxonomy";

export const PRODUCT_FACTS_METAFIELD = { namespace: "bgp", key: "product_information", type: "json" } as const;
/** Owner-reviewed defaults, not SKU compatibility or publication approval. */
export const ownerReviewedDefaults = {
  evidenceId: "MICHAEL-2026-09-09-Q1-Q2", owner: "Michael", reviewedAt: "2026-09-09",
  status: "OWNER_REVIEWED", reviewInterval: "On a product exception or change to construction/product-type semantics",
  source: "Michael's construction and literal product-label answers, relayed by Jason",
  construction: {
    Premium: "Premium uses one-piece formed glass construction.",
    "A Grade": "A Grade uses two layers of glass stacked in the raised three-dimensional portion to create a similar shape.",
  },
} as const;

/** Canonical Premium Plus record: eligible models and the approved camera-lens wording. Not owner-approved for publication. */
export const premiumPlusGrade = premiumPlusGradeJson as {
  cameraLens: string;
  customerFacingWording: string[];
  eligibilityRule: string;
  eligibleModels: Array<{ family: string; model: string; slug: string }>;
  /** Models deliberately outside Premium Plus, with the architectural reason. Not blockers. */
  excludedModels: Array<{ family: string; model: string; reason: string; slug: string; status: string }>;
  evidenceId: string;
  grade: "Premium Plus";
  inheritsFrom: "Premium";
  owner: "Michael";
  prohibitedClaims: string[];
  productForm: "half-assembly";
  recordedBy: "Jason";
  requiredBeforePublication: string[];
  source: string;
  status: string;
};
export const premiumPlusModels: string[] = premiumPlusGrade.eligibleModels.map(entry => entry.model);
/** Premium Plus is offered for these four Pro Max models and nowhere else. */
export function isPremiumPlusModel(model: string | null) {
  return model !== null && premiumPlusModels.includes(normalizeModelName(model));
}
export type GlassGrade = "Premium" | "A Grade" | "Premium Plus";
/** Catalog order: A Grade, then Premium, then Premium Plus. Values are the Shopify tag for each grade. */
export const glassGradeTags = { "A Grade": "a grade", Premium: "premium", "Premium Plus": "premium plus" } as const;
export function isGlassGrade(grade: string | null): grade is GlassGrade {
  return grade !== null && Object.hasOwn(glassGradeTags, grade);
}
/** Premium Plus inherits Premium construction rather than restating it: only the camera lens differs. */
export const glassConstruction: Record<GlassGrade, string> = {
  ...ownerReviewedDefaults.construction,
  "Premium Plus": `Premium Plus uses the same half-assembly construction as Premium. ${ownerReviewedDefaults.construction.Premium}`,
};
export type PartType = "glass-only" | "half-assembly" | "wireless-charging-coil" | "retired-full-assembly";
export type CatalogInput = Pick<StorefrontProduct, "handle" | "title" | "tags" | "variants" | "product_type" | "options" | "product_information">;

/** Supplemental facts only: identity, variants and commerce remain owned by Shopify. */
export interface ReviewedProductDetails {
  version: 1;
  owner: "Michael";
  source: string;
  reviewedAt: string;
  reviewAfter: string;
  includedComponents?: string[];
  excludedComponents?: string[];
  compatibilityNotes?: string[];
  inspectionNotes?: string[];
  installationNotes?: string[];
  compatibleCoilHandles?: string[];
}

export interface ProductInformation {
  handle: string;
  model: string | null;
  family: string | null;
  modelSlug: string | null;
  partType: PartType | null;
  grade: GlassGrade | "OEM" | "Aftermarket" | null;
  coilIncluded: boolean | null;
  construction: string | null;
  cameraLens: string | null;
  packageContents: string | null;
  variants: Array<{ id: number; label: string; sku: string | null }>;
  colors: string[] | null;
  includedComponents: string[] | null;
  excludedComponents: string[] | null;
  compatibilityNotes: string[] | null;
  inspectionNotes: string[] | null;
  installationNotes: string[] | null;
  compatibleCoilHandles: string[];
  source: string;
  review: ReviewedProductDetails | null;
  issues: string[];
}

export function parseReviewedDetails(value: unknown, today = new Date().toISOString().slice(0, 10)): ReviewedProductDetails | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || v.owner !== "Michael" || typeof v.source !== "string" || !v.source.trim()) return null;
  if (typeof v.reviewedAt !== "string" || typeof v.reviewAfter !== "string") return null;
  if (![v.reviewedAt, v.reviewAfter].every(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d)) return null;
  if (v.reviewedAt > today || v.reviewAfter <= today || v.reviewAfter <= v.reviewedAt) return null;
  for (const key of ["includedComponents", "excludedComponents", "compatibilityNotes", "inspectionNotes", "installationNotes", "compatibleCoilHandles"]) {
    if (v[key] !== undefined && (!Array.isArray(v[key]) || !(v[key] as unknown[]).every(x => typeof x === "string" && x.trim()))) return null;
  }
  if ((v.compatibleCoilHandles as string[] | undefined)?.some(h => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(h))) return null;
  // Reject unknown fields: supplemental metadata must not smuggle private notes into a loader payload.
  const allowed = ["version", "owner", "source", "reviewedAt", "reviewAfter", "includedComponents", "excludedComponents", "compatibilityNotes", "inspectionNotes", "installationNotes", "compatibleCoilHandles"];
  if (Object.keys(v).some(key => !allowed.includes(key))) return null;
  return v as unknown as ReviewedProductDetails;
}

export function getProductInformation(product: CatalogInput, reviewed: unknown = product.product_information, source = "Shopify catalog record"): ProductInformation {
  const title = product.title;
  const modelMatch = title.match(/^(iPhone .+?) (?:Large Hole Back Glass|Back Glass|Wireless Charging Coil)(?:\s|$)/i);
  const model = modelMatch ? normalizeModelName(modelMatch[1]) : null;
  const partType: PartType | null = /full assembly/i.test(title) ? "retired-full-assembly"
    : /wireless charging coil/i.test(title) ? "wireless-charging-coil"
    : /half assembly/i.test(title) ? "half-assembly"
    : /large hole back glass/i.test(title) ? "glass-only" : null;
  const grade = /-\s*Premium Plus$/i.test(title) ? "Premium Plus" : /-\s*Premium$/i.test(title) ? "Premium" : /-\s*A Grade$/i.test(title) ? "A Grade"
    : /-\s*Aftermarket$/i.test(title) ? "Aftermarket" : /-\s*OEM$/i.test(title) ? "OEM" : null;
  const coilIncluded = /(?:no coil|without (?:wireless )?charging coil)/i.test(title) ? false
    : /full assembly.*with coil/i.test(title) ? true : null;
  const review = parseReviewedDetails(reviewed);
  const issues: string[] = [];
  if (!model) issues.push("missing-model");
  if (!partType) issues.push("missing-part-type");
  if (!grade) issues.push("missing-grade");
  if (partType === "wireless-charging-coil" && product.product_type !== "Wireless Charging Coil") issues.push("product-type-conflict");
  if (partType && partType !== "wireless-charging-coil" && product.product_type !== "Back Glass") issues.push("product-type-conflict");
  const tags = product.tags.map(t => t.toLowerCase());
  if (isGlassGrade(grade) && Object.entries(glassGradeTags).some(([other, tag]) => other !== grade && tags.includes(tag))) issues.push("grade-tag-conflict");
  if (grade === "Premium Plus" && !isPremiumPlusModel(model)) issues.push("premium-plus-model-eligibility-conflict");
  if (grade === "Premium Plus" && partType !== null && partType !== "half-assembly") issues.push("premium-plus-part-type-conflict");
  if (reviewed && !review) issues.push("invalid-or-expired-fact-review");
  if (partType === "wireless-charging-coil" && isGlassGrade(grade)) issues.push("coil-grade-taxonomy-conflict");
  if (partType !== "wireless-charging-coil" && (grade === "OEM" || grade === "Aftermarket")) issues.push("glass-grade-taxonomy-conflict");
  if (partType === "half-assembly" && coilIncluded !== false) issues.push("half-assembly-coil-status-unverified");
  if (product.variants.some(v => !v.sku?.trim())) issues.push("missing-sku");
  // Premium Plus copy is gated on the model rule, so an ineligible listing publishes no Premium Plus claim at all.
  const premiumPlus = grade === "Premium Plus" && partType === "half-assembly" && isPremiumPlusModel(model);
  const excluded = review?.excludedComponents ?? (coilIncluded === false ? ["Wireless charging coil"] : null);
  if (coilIncluded === false && review?.includedComponents?.some(x => /charging coil/i.test(x))) issues.push("component-coil-conflict");
  return {
    handle: product.handle, model, family: model ? getModelFamily(model) : null,
    modelSlug: model ? getModelSlug(model) : null, partType, grade, coilIncluded,
    construction: premiumPlus ? glassConstruction["Premium Plus"] : (partType === "glass-only" || partType === "half-assembly") && (grade === "Premium" || grade === "A Grade") ? ownerReviewedDefaults.construction[grade] : null,
    cameraLens: premiumPlus ? premiumPlusGrade.cameraLens : null,
    packageContents: partType === "glass-only" ? "Glass only" : partType === "half-assembly" && coilIncluded === false ? "Half assembly — wireless charging coil not included" : partType === "wireless-charging-coil" ? "Wireless charging coil only" : null,
    variants: product.variants.map(v => ({ id: v.id, label: v.title, sku: v.sku?.trim() || null })),
    colors: product.options?.find(o => /^colou?r$/i.test(o.name))?.values ?? null,
    includedComponents: review?.includedComponents ?? (partType === "glass-only" ? ["Glass only"] : partType === "wireless-charging-coil" ? ["Wireless charging coil only"] : null),
    excludedComponents: coilIncluded === false ? [...new Set([...(excluded ?? []), "Wireless charging coil"])] : excluded,
    compatibilityNotes: review?.compatibilityNotes ?? null,
    inspectionNotes: review?.inspectionNotes ?? null, installationNotes: review?.installationNotes ?? null,
    compatibleCoilHandles: review?.compatibleCoilHandles ?? [], source, review, issues,
  };
}

/** True only for a Premium Plus half assembly on one of the four eligible Pro Max models. */
export function isPremiumPlusProduct(facts: ProductInformation) {
  return facts.grade === "Premium Plus" && facts.partType === "half-assembly" && isPremiumPlusModel(facts.model) && !facts.issues.some(issue => issue.startsWith("premium-plus-"));
}

export const partLabels: Record<PartType, string> = {
  "glass-only": "Glass only", "half-assembly": "Half assembly",
  "wireless-charging-coil": "Wireless charging coil", "retired-full-assembly": "Retired full assembly",
};

export function productDescription(facts: ProductInformation) {
  if (!facts.model || !facts.partType || !facts.grade || facts.partType === "retired-full-assembly") return null;
  return [
    `${facts.model} ${partLabels[facts.partType].toLowerCase()}, listed as ${facts.grade}, for mobile-device repair professionals.`,
    facts.coilIncluded === false ? "Wireless charging coil is not included." : "",
    facts.construction ?? "",
    facts.cameraLens ?? "",
    facts.packageContents ? `Contents: ${facts.packageContents}.` : "",
    "Select the exact model and listed variant before ordering.",
  ].filter(Boolean).join(" ");
}

export function productFactRows(facts: ProductInformation): Array<[string, string]> {
  return [
    ["iPhone model", facts.model], ["Part type", facts.partType && partLabels[facts.partType]],
    ["Catalog grade", facts.grade], ["Wireless charging coil included", facts.coilIncluded === null ? null : facts.coilIncluded ? "Yes" : "No"],
    ["Glass construction", facts.construction], ["Camera lens", facts.cameraLens],
    ["Package contents (product-label meaning)", facts.packageContents],
    ["Listed colors", facts.colors?.join(", ")],
    ["Included components", facts.includedComponents?.join(", ")], ["Not included", facts.excludedComponents?.join(", ")],
  ].filter((r): r is [string, string] => Boolean(r[1]));
}

/** A matching model name alone is NOT a verified compatibility relationship. */
export function compatibleCoils(facts: ProductInformation, products: CatalogInput[]) {
  const review = parseReviewedDetails(facts.review);
  if (!review || facts.issues.length) return [];
  return products.filter(p => {
    const candidate = getProductInformation(p);
    return review.compatibleCoilHandles?.includes(p.handle) && facts.compatibleCoilHandles.includes(p.handle) && candidate.partType === "wireless-charging-coil" && candidate.model === facts.model;
  });
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function productInformationHtml(facts: ProductInformation) {
  const description = productDescription(facts);
  if (!description || facts.issues.some(i => i.endsWith("conflict"))) return null;
  return `<section data-bgp-product-information="1"><p>${escapeHtml(description)}</p><h2>Product details</h2><dl>${productFactRows(facts).map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`).join("")}</dl>${[
    ["Compatibility notes", facts.compatibilityNotes], ["Inspection notes", facts.inspectionNotes], ["Installation notes", facts.installationNotes],
  ].map(([heading, notes]) => Array.isArray(notes) && notes.length ? `<h2>${heading}</h2><ul>${notes.map(n => `<li>${escapeHtml(n)}</li>`).join("")}</ul>` : "").join("")}</section>`;
}
