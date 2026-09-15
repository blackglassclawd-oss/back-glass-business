import { describe, expect, it } from "vitest";

import {
  catalogEntries,
  customerVisibleProducts,
  filterCatalogEntries,
  filterProducts,
  findProduct,
} from "./catalog.server";
import {
  blockedCoilModels,
  coilCatalogModels,
  coilDraftProducts,
} from "./product-taxonomy";

describe("customer-visible catalog policy", () => {
  it("keeps full assemblies out of catalog and search results", () => {
    expect(customerVisibleProducts).toHaveLength(54);
    expect(
      customerVisibleProducts.some((product) =>
        product.title.toLowerCase().includes("full assembly"),
      ),
    ).toBe(false);
    expect(filterProducts("full assembly", "all")).toEqual([]);
  });

  it("preserves discontinued products for direct transition pages", () => {
    const product = findProduct(
      "iphone-15-pro-max-full-assembly-with-coil-a-grade",
    );
    expect(product?.title).toContain("Full Assembly");
  });

  it("stages two unavailable coil grades for every verified model", () => {
    expect(coilCatalogModels).toHaveLength(15);
    expect(coilDraftProducts).toHaveLength(30);
    expect(catalogEntries).toHaveLength(84);

    for (const model of coilCatalogModels) {
      const products = coilDraftProducts.filter(
        (product) => product.model === model.model,
      );
      expect(products.map((product) => product.grade).sort()).toEqual([
        "Aftermarket",
        "OEM",
      ]);
      expect(
        products.every(
          (product) =>
            product.status === "DRAFT" &&
            product.price === null &&
            product.inventory === null &&
            product.sku === null &&
            product.media === null,
        ),
      ).toBe(true);
    }
  });

  it("stages 17e without media and keeps 16e blocked", () => {
    expect(blockedCoilModels.map((model) => model.model)).toEqual(["iPhone 16e"]);
    expect(
      coilDraftProducts.some((product) => product.model === "iPhone 17e"),
    ).toBe(true);
    expect(
      coilDraftProducts.some((product) => product.model === "iPhone 16e"),
    ).toBe(false);
  });

  it("keeps part-type and grade filtering unambiguous", () => {
    expect(filterCatalogEntries("", "wireless-charging-coils")).toHaveLength(
      30,
    );
    expect(filterCatalogEntries("", "oem")).toHaveLength(15);
    expect(filterCatalogEntries("", "aftermarket")).toHaveLength(15);
    expect(
      filterCatalogEntries("wireless charging coil", "back-glass"),
    ).toEqual([]);
    expect(filterCatalogEntries("full assembly", "all")).toEqual([]);
  });
});
