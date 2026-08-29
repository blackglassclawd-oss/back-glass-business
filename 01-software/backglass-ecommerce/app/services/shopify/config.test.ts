import { describe, expect, it } from "vitest";

import {
  loadShopifyConfig,
  normalizeShopifyDomain,
  ShopifyConfigError,
} from "./config";

describe("normalizeShopifyDomain", () => {
  it("normalizes a valid Shopify hostname", () => {
    expect(normalizeShopifyDomain(" KFCZYU-KC.myshopify.com ")).toBe(
      "kfczyu-kc.myshopify.com",
    );
  });

  it.each([
    "https://kfczyu-kc.myshopify.com",
    "kfczyu-kc.myshopify.com/admin",
    "example.com",
    "evil.myshopify.com.example.com",
  ])("rejects unsafe domain input: %s", (domain) => {
    expect(() => normalizeShopifyDomain(domain)).toThrow(ShopifyConfigError);
  });
});

describe("loadShopifyConfig", () => {
  it("loads the read-only integration configuration", () => {
    expect(
      loadShopifyConfig({
        SHOPIFY_CLIENT_ID: "client",
        SHOPIFY_CLIENT_SECRET: "secret",
        SHOPIFY_STORE_DOMAIN: "kfczyu-kc.myshopify.com",
      }),
    ).toEqual({
      apiVersion: "2026-07",
      clientId: "client",
      clientSecret: "secret",
      storeDomain: "kfczyu-kc.myshopify.com",
    });
  });

  it("reports all missing secrets together", () => {
    try {
      loadShopifyConfig({
        SHOPIFY_STORE_DOMAIN: "kfczyu-kc.myshopify.com",
      });
      throw new Error("Expected configuration to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ShopifyConfigError);
      expect((error as ShopifyConfigError).missing).toEqual([
        "SHOPIFY_CLIENT_ID",
        "SHOPIFY_CLIENT_SECRET",
      ]);
    }
  });
});
