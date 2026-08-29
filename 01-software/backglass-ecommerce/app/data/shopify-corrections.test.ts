import { describe, expect, it } from "vitest";

import corrections from "../../data/catalog/shopify-corrections-2026-08-03.json";
import catalogJson from "../../data/storefront/catalog.json";
import type { StorefrontCatalog } from "./catalog.shared";

const catalog = catalogJson as unknown as StorefrontCatalog;

describe("annotated Shopify corrections", () => {
  it("matches the captured catalog records that need metadata changes", () => {
    const alpineGreen = catalog.products
      .flatMap((product) => product.variants)
      .find((variant) => variant.sku === "SKU-I13PROMAX-PREMIUM-GREEN");
    const premium16ProMax = catalog.products.find(
      (product) => product.id === 8112326246572,
    );
    const xsMaxAGrade = catalog.products.find(
      (product) => product.id === 8100269785260,
    );

    expect(alpineGreen?.title).toBe("Alpine Greeen");
    expect(premium16ProMax?.handle).toBe(
      "iphone-16-pro-max-back-glass-half-assembly-no-coil-a-grade-copy",
    );
    expect(premium16ProMax?.tags).toContain("premium");
    expect(xsMaxAGrade?.handle).toBe(
      "iphone-xs-max-large-hole-back-glass-a-grade",
    );
  });

  it("limits media work to the exact highlighted variants", () => {
    const markedSkus = corrections.mediaCorrections.flatMap(
      (correction) => correction.skus,
    );

    expect(markedSkus).toHaveLength(15);
    expect(new Set(markedSkus).size).toBe(markedSkus.length);

    for (const correction of corrections.mediaCorrections) {
      const sourceHandle = correction.currentHandle ?? correction.productHandle;
      const product = catalog.products.find(
        (candidate) => candidate.handle === sourceHandle,
      );
      const productSkus = new Set(
        product?.variants.map((variant) => variant.sku) ?? [],
      );

      expect(product, sourceHandle).toBeDefined();
      expect(
        correction.skus.every((sku) => productSkus.has(sku)),
        sourceHandle,
      ).toBe(true);
    }

    expect(markedSkus).not.toContain("SKU-I14-PLUS-PREMIUM-MIDNIGHT-HA");
    expect(markedSkus).not.toContain("SKU-I15-PRO-MAX-PREMIUM-WHITE-HA");
    expect(markedSkus).not.toContain("SKU-I16-PRO-PREMIUM-BLACK-HA");
    expect(markedSkus).not.toContain(
      "SKU-I16-PRO-MAX-PREMIUM-BLACK-HA",
    );
  });

  it("keeps Shopify first and prevents destructive retirement", () => {
    expect(corrections.executionOrder).toBe("shopify-first");
    expect(corrections.cloudflareBlockedUntilShopifyApproval).toBe(true);
    expect(corrections.statusUpdates.every((update) => !update.delete)).toBe(
      true,
    );
    expect(corrections.mediaGuardrails).toMatchObject({
      exteriorOnlyCropsApproved: false,
      generatedProductImagery: false,
      preserveColorSpecificAssignments: true,
      requireVerifiedHalfAssemblySources: true,
    });
  });
});
