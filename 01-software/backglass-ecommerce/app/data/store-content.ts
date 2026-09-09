/**
 * Homepage positioning. Every line here must describe something a customer can
 * actually browse or buy today.
 *
 * Wireless charging coils are deliberately absent: all 30 coil products are
 * DRAFT and /collections/wireless-charging-coils returns 404, so naming them in
 * the title or heading would promise a category the store cannot fulfil.
 * Restore them here once coils are published.
 */
export const storefrontPositioning = {
  title: "iPhone Back Glass & Half Assemblies for Repair Shops | Back Glass Pros",
  description: "Replacement iPhone back glass and half assemblies for mobile-device repair professionals. Browse Premium and A Grade glass-only and half-assembly listings by exact iPhone model.",
  heading: "iPhone Back Glass and Half Assemblies for Repair Professionals",
  introduction: "Back Glass Pros supplies replacement iPhone back glass to mobile-device repair professionals. Browse by exact model, part type and catalog grade. Half assemblies labelled No Coil do not include a wireless charging coil.",
  announcement: "Replacement iPhone back glass and half assemblies for repair professionals",
  /** Only collections that are published and reachable today. */
  importantCollections: ["premium", "a-grade", "glass-only", "half-assembly-without-charging-coil"],
  owner: "Jason",
  source: "AGENTS.md and 10-knowledge/CATALOG.md; live Shopify catalog audit 2026-09-09",
  reviewAfter: "2026-12-08",
} as const;
