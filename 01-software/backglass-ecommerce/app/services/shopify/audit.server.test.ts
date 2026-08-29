import { describe, expect, it, vi } from "vitest";

import type { ShopifyAdminClient } from "./admin.server";
import { captureShopifyStoreAudit } from "./audit.server";

describe("captureShopifyStoreAudit", () => {
  it("returns an operational summary without customer or order details", async () => {
    const query = vi.fn().mockResolvedValue({
      appInstallations: {
        nodes: [
          { app: { title: "Quick Order" } },
          { app: { title: "Back Glass Migration" } },
        ],
      },
      catalogs: {
        nodes: [{ status: "ACTIVE", title: "Wholesale" }],
      },
      companiesCount: { count: 2 },
      currentAppInstallation: {
        accessScopes: [
          { handle: "read_orders" },
          { handle: "read_products" },
        ],
      },
      customersCount: { count: 13 },
      locations: {
        nodes: [
          { isActive: true, name: "Main" },
          { isActive: false, name: "Legacy" },
        ],
      },
      markets: {
        nodes: [{ name: "United States", status: "ACTIVE" }],
      },
      orders: {
        nodes: [
          {
            displayFinancialStatus: "PAID",
            displayFulfillmentStatus: "FULFILLED",
          },
          {
            displayFinancialStatus: "PAID",
            displayFulfillmentStatus: "UNFULFILLED",
          },
        ],
        pageInfo: { hasNextPage: false },
      },
      ordersCount: { count: 2 },
      productsCount: { count: 84 },
      productVariantsCount: { count: 384 },
      shop: {
        currencyCode: "USD",
        ianaTimezone: "America/Chicago",
        id: "gid://shopify/Shop/1",
        myshopifyDomain: "kfczyu-kc.myshopify.com",
        name: "Back Glass Pros",
        plan: {
          displayName: "Basic",
          partnerDevelopment: false,
          shopifyPlus: false,
        },
        primaryDomain: {
          host: "backglasspros.com",
          url: "https://backglasspros.com",
        },
        setupRequired: false,
      },
    });

    const audit = await captureShopifyStoreAudit({
      query,
    } as unknown as ShopifyAdminClient);

    expect(audit).toMatchObject({
      app: {
        accessMode: "read-only",
        accessScopes: ["read_orders", "read_products"],
        installedApps: ["Back Glass Migration", "Quick Order"],
      },
      catalog: { products: 84, variants: 384 },
      commerce: {
        financialStatuses: { PAID: 2 },
        fulfillmentStatuses: { FULFILLED: 1, UNFULFILLED: 1 },
        orders: 2,
        sampledOrders: 2,
        sampleHasMore: false,
      },
      customers: { companies: 2, customers: 13 },
      inventory: {
        activeLocations: 1,
        locations: ["Legacy", "Main"],
      },
      merchandising: {
        activeMarkets: 1,
        catalogs: ["Wholesale"],
        markets: ["United States"],
      },
    });
    expect(query).toHaveBeenCalledOnce();
  });
});
