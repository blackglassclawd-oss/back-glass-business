import { describe, expect, it } from "vitest";
import type { StorefrontProduct } from "./catalog.shared";
import {
  buildShopifyCartUrl,
  parseQuickOrder,
} from "./quick-order.shared";

const products = [
  {
    variants: [
      { available: true, id: 101, sku: "SKU-I15-BLACK" },
      { available: false, id: 102, sku: "SKU-I15-BLUE" },
    ],
  },
] as StorefrontProduct[];

describe("parseQuickOrder", () => {
  it("accepts comma, tab, and whitespace-separated lines", () => {
    const result = parseQuickOrder(
      "SKU-I15-BLACK, 2\nSKU-I15-BLACK\t3\nSKU-I15-BLACK 1",
      products,
    );

    expect(result).toEqual({
      errors: [],
      lines: [{ quantity: 6, sku: "SKU-I15-BLACK", variantId: 101 }],
    });
  });

  it("reports malformed, missing, and unavailable SKUs", () => {
    const result = parseQuickOrder(
      "bad line\nmissing-sku, 2\nSKU-I15-BLUE, 1",
      products,
    );

    expect(result.lines).toEqual([]);
    expect(result.errors).toHaveLength(3);
  });
});

describe("buildShopifyCartUrl", () => {
  it("builds a Shopify cart permalink", () => {
    expect(
      buildShopifyCartUrl("https://example.myshopify.com", [
        { quantity: 2, sku: "A", variantId: 101 },
        { quantity: 4, sku: "B", variantId: 202 },
      ]),
    ).toBe("https://example.myshopify.com/cart/101:2,202:4");
  });
});
