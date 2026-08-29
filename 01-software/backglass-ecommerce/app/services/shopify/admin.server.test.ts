import { afterEach, describe, expect, it, vi } from "vitest";

import { ShopifyAdminClient } from "./admin.server";

const config = {
  apiVersion: "2026-07",
  clientId: "client-id",
  clientSecret: "client-secret",
  storeDomain: "kfczyu-kc.myshopify.com",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ShopifyAdminClient", () => {
  it("invokes the native fetcher without rebinding its receiver", async () => {
    let callCount = 0;
    const fetcher = vi.fn(function (this: unknown) {
      if (this !== globalThis) {
        throw new TypeError("Illegal invocation");
      }

      callCount += 1;
      return Promise.resolve(
        callCount === 1
          ? Response.json({
              access_token: "access-token",
              expires_in: 86399,
              scope: "read_products",
            })
          : Response.json({ data: { shop: { name: "BGP" } } }),
      );
    });
    vi.stubGlobal("fetch", fetcher);

    const client = new ShopifyAdminClient(config);

    await expect(client.query("query { shop { name } }")).resolves.toEqual({
      shop: { name: "BGP" },
    });
  });

  it("requests a token and reuses it for GraphQL queries", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          access_token: "access-token",
          expires_in: 86399,
          scope: "read_products",
        }),
      )
      .mockResolvedValueOnce(Response.json({ data: { shop: { name: "BGP" } } }))
      .mockResolvedValueOnce(Response.json({ data: { shop: { name: "BGP" } } }));
    const client = new ShopifyAdminClient(config, fetcher);

    await client.query("query { shop { name } }");
    await client.query("query { shop { name } }");

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://kfczyu-kc.myshopify.com/admin/oauth/access_token",
    );
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      "https://kfczyu-kc.myshopify.com/admin/api/2026-07/graphql.json",
    );
    expect(fetcher.mock.calls[1]?.[1]?.headers).toMatchObject({
      "X-Shopify-Access-Token": "access-token",
    });
  });
});
