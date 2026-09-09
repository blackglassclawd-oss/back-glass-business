import { createRequestHandler } from "react-router";

import { applySecurityHeaders } from "../app/services/security-headers.server";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request) {
    const response = await requestHandler(request);
    const headers = applySecurityHeaders(new Headers(response.headers));
    // This application is preview infrastructure. Shopify is the indexed storefront.
    headers.set("X-Robots-Tag", "noindex, nofollow");

    if (new URL(request.url).pathname === "/api/shopify/status") {
      headers.set("Cache-Control", "no-store");
    }

    return new Response(response.body, {
      headers,
      status: response.status,
      statusText: response.statusText,
    });
  },
} satisfies ExportedHandler<Env>;
