const SHOPIFY_ROUTE_HOSTS = new Set([
  "backglasspros.com",
  "www.backglasspros.com",
]);

export async function proxyShopifyRequest(
  request: Request,
  originFetch: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(request.url);

  if (!SHOPIFY_ROUTE_HOSTS.has(url.hostname)) {
    return Response.json(
      {
        status: "ready",
        detail:
          "This Worker is an exact pass-through only when attached to the backglasspros.com Cloudflare route.",
      },
      {
        status: 421,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  try {
    // On a Cloudflare Worker Route, fetching the original incoming Request
    // forwards it to the DNS-configured Shopify origin without changing the
    // request or buffering/modifying the origin response.
    return await originFetch(request);
  } catch (error) {
    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown origin error",
        message: "Shopify pass-through origin request failed",
        path: url.pathname,
      }),
    );
    return new Response("Shopify origin unavailable", {
      status: 502,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}

export default {
  async fetch(request): Promise<Response> {
    return proxyShopifyRequest(request);
  },
} satisfies ExportedHandler;
