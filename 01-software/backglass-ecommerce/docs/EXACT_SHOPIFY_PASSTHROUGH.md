# Exact Shopify Pass-Through

## Decision

The initial production Cloudflare storefront will be a transparent Worker Route
in front of Shopify. The Worker returns Shopify's original `Response` object
without reading, rewriting, caching, or replacing its body, headers, cookies,
HTML, assets, app extensions, cart, customer-account flow, or checkout.

This is the only architecture that guarantees the browser-visible storefront
remains the Shopify storefront. It does not make the storefront independent of
Shopify.

The existing React Router storefront remains a separate preview at
`backglass-ecommerce.backglasspros.workers.dev`. It must not replace a Shopify
route until that route passes approved visual, URL, cart, account, checkout,
analytics, and SEO parity tests.

## Files

- `workers/shopify-passthrough.ts` — unchanged request/response pass-through.
- `workers/shopify-passthrough.test.ts` — request/response identity and failure
  tests.
- `wrangler.shopify-passthrough.jsonc` — isolated staging and production
  configuration.
- `worker-passthrough-configuration.d.ts` — generated bindings/runtime types.
- `tsconfig.passthrough.json` — isolated strict typecheck.
- `.passthrough.env` — intentionally empty environment file that prevents the
  proxy build from discovering or uploading unrelated application secrets.

## Production prerequisites

Cloudflare Worker Routes require an active Cloudflare zone and orange-clouded
DNS records. As of 2026-08-09, the authoritative nameservers remain at Porkbun:

```text
curitiba.ns.porkbun.com
fortaleza.ns.porkbun.com
maceio.ns.porkbun.com
salvador.ns.porkbun.com
```

The domain must be activated on Cloudflare and its Shopify DNS records must be
verified before the production route can receive traffic. Nameserver and DNS
cutover is a production change and must occur only after the pre-cutover record
comparison and rollback checklist pass.

## Current activation status

Checked on 2026-08-09:

- Cloudflare zone `backglasspros.com` (`dee6229277732c5f0a29e45a90a0078d`)
  is pending and is assigned `carlos.ns.cloudflare.com` and
  `christina.ns.cloudflare.com`.
- Worker version `b2078b3b-f07a-4c8d-80f9-831dffb7cd05` is deployed as
  `backglass-shopify-passthrough-production`.
- Cloudflare has attached that Worker to both `backglasspros.com/*` and
  `www.backglasspros.com/*`.
- Porkbun currently serves the Shopify apex record `23.227.38.65` and
  `www.backglasspros.com` CNAME `shops.myshopify.com`.
- Cloudflare's pending zone still serves the stale Porkbun parking records
  `207.207.210.36`, `207.207.210.50`, and `www.backglasspros.com` CNAME
  `uixie.porkbun.com`.

The nameserver cutover is therefore intentionally blocked. Changing the
registrar nameservers before replacing and verifying the stale Cloudflare DNS
records would interrupt the Shopify storefront. Activation requires an
authenticated Cloudflare DNS edit followed by an authenticated Porkbun
nameserver change. The live site remains on the unchanged Shopify DNS until
both gates pass.

## Verification

```bash
npm run verify:passthrough
```

The production deployment command is deliberately separate:

```bash
npm run deploy:passthrough:production
```

After the Cloudflare nameservers are authoritative, verify at minimum:

1. Homepage and representative collection/product screenshots match the
   pre-cutover Shopify baseline at desktop and mobile viewports.
2. Response status, redirects, canonical URLs, robots directives, structured
   data, cookies, and asset requests match.
3. Search, product options, cart add/update/remove, account login, discount,
   shipping, checkout, payment handoff, order creation, notifications, and
   installed storefront apps work unchanged.
4. Shopify Admin still controls catalog, price, inventory, customers, orders,
   payments, refunds, and fulfillment.

## Rollback

The Shopify origin and its data are not changed by this implementation. If the
Worker route causes a production problem, detach the two Worker Routes from
`backglasspros.com/*` and `www.backglasspros.com/*`. Cloudflare DNS will then
send requests directly to the unchanged Shopify origin.
