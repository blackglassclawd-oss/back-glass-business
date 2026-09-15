import { expect, it } from "vitest";
import { planProductDescription } from "./seo-content-plan";
const block = '<section data-bgp-product-information="1"><p>New facts</p></section>';
it("blocks even short merchant descriptions and retains both sides for owner review", () => {
  expect(planProductDescription("<p>Keep me</p>", block)).toMatchObject({
    existingDescriptionHtml: "<p>Keep me</p>", candidateInformationHtml: block,
    blockers: ["existing-description-needs-merge-review"], descriptionHtml: null,
  });
});
it("preserves merchant text surrounding a single owned section and its owned link", () => {
  const before = '<p>Merchant before</p>';
  const after = '<p>Merchant after $&</p>';
  expect(planProductDescription(before + block + '<p data-bgp-related-collection="1"><a href="/collections/glass-only">Browse</a></p>' + after, block).descriptionHtml).toBe(before + block + after);
});
it("preserves an unmarked merchant collection link beside an owned section", () => {
  const merchant = '<p><a href="/collections/glass-only">Merchant guidance</a></p>';
  expect(planProductDescription(block + merchant, block).descriptionHtml).toBe(block + merchant);
});
it("blocks ambiguous multiple owned sections and accepts an empty description", () => {
  expect(planProductDescription(block + block, block).descriptionHtml).toBeNull();
  expect(planProductDescription("  ", block).descriptionHtml).toBe(block);
});
