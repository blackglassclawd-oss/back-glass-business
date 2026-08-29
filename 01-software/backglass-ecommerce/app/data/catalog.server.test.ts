import { describe, expect, it } from "vitest";

import {
  customerVisibleProducts,
  filterProducts,
  findProduct,
} from "./catalog.server";

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
});
