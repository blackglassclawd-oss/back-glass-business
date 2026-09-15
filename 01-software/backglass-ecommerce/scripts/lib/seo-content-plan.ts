/** Keep review candidates separate from eligible proposals. Never writes Shopify. */
export function planProductDescription(existing: string, body: string | null) {
  const owned = /<section data-bgp-product-information="1">[\s\S]*?<\/section>(?:<p data-bgp-related-collection="1"><a href="\/collections\/[^\"]+">[\s\S]*?<\/a><\/p>)?/g;
  const matches = [...existing.matchAll(owned)];
  const blockers = matches.length > 1 ? ["multiple-owned-description-blocks"]
    : existing.trim() && !matches.length ? ["existing-description-needs-merge-review"] : [];
  return {
    existingDescriptionHtml: existing,
    candidateInformationHtml: body,
    blockers,
    descriptionHtml: !body || blockers.length ? null : matches.length === 1
      ? existing.replace(owned, () => body) : body,
  };
}
