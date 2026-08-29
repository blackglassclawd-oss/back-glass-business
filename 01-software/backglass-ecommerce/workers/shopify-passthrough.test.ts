import { describe, expect, it } from "vitest";

import { proxyShopifyRequest } from "./shopify-passthrough";

describe("Shopify exact pass-through", () => {
  it("returns the exact origin Response for the production hostname", async () => {
    const request = new Request("https://backglasspros.com/products/example", {
      headers: { Cookie: "cart=test-cart" },
    });
    const originResponse = new Response("shopify-origin-body", {
      headers: {
        "Set-Cookie": "cart=test-cart; Path=/; Secure",
        "X-Shopify-Test": "preserved",
      },
      status: 200,
    });
    let forwardedRequest: Request | undefined;
    const originFetch: typeof fetch = async (input) => {
      forwardedRequest = input as Request;
      return originResponse;
    };

    const response = await proxyShopifyRequest(request, originFetch);

    expect(forwardedRequest).toBe(request);
    expect(response).toBe(originResponse);
  });

  it("does not proxy a workers.dev preview hostname", async () => {
    const request = new Request(
      "https://backglass-shopify-passthrough.backglasspros.workers.dev/",
    );
    let called = false;
    const originFetch: typeof fetch = async () => {
      called = true;
      return new Response("unexpected");
    };

    const response = await proxyShopifyRequest(request, originFetch);

    expect(called).toBe(false);
    expect(response.status).toBe(421);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ status: "ready" });
  });

  it("returns an explicit non-cacheable 502 when the Shopify origin fails", async () => {
    const request = new Request("https://www.backglasspros.com/cart");
    const originFetch: typeof fetch = async () => {
      throw new Error("origin offline");
    };

    const response = await proxyShopifyRequest(request, originFetch);

    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
