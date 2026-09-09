import { getProductInformation, ownerReviewedDefaults, type CatalogInput } from "./product-information";

export const collectionContentReview = {
  owner: "Michael", publicationOwner: "Jason", status: "APPROVAL_REQUIRED",
  source: `Shopify catalog title/type taxonomy and explicit No Coil labels; existing coil draft matrix; ${ownerReviewedDefaults.evidenceId}`,
  calculation: "Category definitions only; no technical grade or fitment inference",
  reviewInterval: "Before publication and whenever catalog taxonomy or coil status changes",
} as const;

export const collectionDefinitions = {
  "back-glass": {
    title: "iPhone Back Glass", description: "Replacement iPhone back glass for mobile-device repair professionals. Browse by model, catalog grade and part type; glass-only and half-assembly listings are separate categories.",
    related: ["glass-only", "half-assembly-without-charging-coil", "wireless-charging-coils"], guide: "glass-only-vs-half-assembly",
  },
  premium: {
    title: "Premium iPhone Back Glass", description: `${ownerReviewedDefaults.construction.Premium} Browse by exact iPhone model and glass-only or half-assembly format. Check the listed variant and coil information; construction alone does not establish performance or Apple/OEM origin.`,
    related: ["a-grade", "glass-only", "half-assembly-without-charging-coil"], guide: "premium-vs-a-grade",
  },
  "a-grade": {
    title: "A Grade iPhone Back Glass", description: `${ownerReviewedDefaults.construction["A Grade"]} Match the exact iPhone model, part type and listed variant. This construction distinction does not establish performance or Apple/OEM origin.`,
    related: ["premium", "glass-only", "half-assembly-without-charging-coil"], guide: "premium-vs-a-grade",
  },
  "half-assembly-without-charging-coil": {
    title: "iPhone Back Glass Half Assemblies Without Charging Coil", description: "Replacement iPhone back glass listed as half assemblies without a wireless charging coil. Choose the exact model, grade and variant. A separately sold coil requires its own verified model compatibility; do not assume a coil is included with the half assembly.",
    related: ["glass-only", "wireless-charging-coils", "premium", "a-grade"], guide: "glass-only-vs-half-assembly",
  },
  "glass-only": {
    title: "iPhone Glass-Only Replacement Back Glass", description: "Glass Only means glass only. Browse large-hole back-glass listings by exact iPhone model, grade and variant. These are distinct from half assemblies without charging coils. Do not assume additional accessories from the product category.",
    related: ["half-assembly-without-charging-coil", "premium", "a-grade"], guide: "glass-only-vs-half-assembly",
  },
  "wireless-charging-coils": {
    title: "Wireless Charging Coils", description: "Standalone iPhone wireless charging coils, organized by the same model families as the back-glass catalog. Coils are separate products, not included full assemblies. Current listings remain unavailable drafts while compatibility and product details are reviewed.",
    related: ["half-assembly-without-charging-coil", "back-glass"], guide: "wireless-charging-coil-compatibility",
  },
} as const;
export type CollectionSlug = keyof typeof collectionDefinitions;
export function isCollectionSlug(value: string): value is CollectionSlug {
  return Object.hasOwn(collectionDefinitions, value);
}
export function belongsToCollection(product: CatalogInput, slug: CollectionSlug) {
  const f = getProductInformation(product);
  if (!f.partType || f.partType === "retired-full-assembly") return false;
  switch (slug) {
    case "wireless-charging-coils": return f.partType === "wireless-charging-coil";
    case "back-glass": return f.partType !== "wireless-charging-coil";
    case "premium": return f.grade === "Premium" && f.partType !== "wireless-charging-coil";
    case "a-grade": return f.grade === "A Grade" && f.partType !== "wireless-charging-coil";
    case "glass-only": return f.partType === "glass-only";
    case "half-assembly-without-charging-coil": return f.partType === "half-assembly" && f.coilIncluded === false;
  }
}
