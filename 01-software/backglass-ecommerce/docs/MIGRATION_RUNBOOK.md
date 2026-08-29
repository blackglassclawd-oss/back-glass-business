# Migration Runbook

## Current identity

- Business: Back Glass Pros
- Shopify domain: `kfczyu-kc.myshopify.com`
- Intended custom domain: `backglasspros.com`
- Migration mode: read-only
- Target runtime: Cloudflare Workers with React Router

## Current status

Observed on July 28, 2026:

- Shopify owner access is restored.
- `backglasspros.com` is registered at Porkbun and visible in the `.com`
  registry.
- Porkbun WHOIS privacy, auto-renew, and registrar lock are enabled.
- The public Shopify storefront returns HTTP `200`.
- A public snapshot captured 66 products, 312 variants, 83 routes, and 682
  unique assets with no download failures.
- Every downloaded asset has a SHA-256 checksum in the snapshot manifest.
- The local visual clone includes catalog search, category filters, pagination,
  product pages, quick order, and Shopify cart handoff.
- The `Back Glass Migration` Shopify app is installed with read-only Admin API
  scopes. Its credentials are stored in the ignored, owner-only `.dev.vars`.
- The first authenticated backup captured 84 product roots, 384 inventory
  roots, and 5 order roots under `backups/admin/`, with SHA-256 checksums.
- The live operational audit reports 84 products, 384 variants, 5 paid orders,
  13 customers, no B2B companies, and two active inventory locations.
- Shopify Admin remains the management backend. Shopify checkout remains the
  authority for payments, tax, shipping, orders, refunds, and fulfillment.
- Public checkout configuration reports Shopify Payments, PayPal, Apple Pay, and
  Google Pay enabled for USD checkout.
- The backend and payment architecture is recorded in
  `docs/BACKEND_AND_PAYMENTS.md`.
- Nineteen installed Shopify apps are inventoried. Five overlap on quick-order and
  bulk-cart behavior; the preservation-first review is recorded in
  `docs/APP_CONSOLIDATION.md`.
- The product owner directed the catalog to retain no-coil half assemblies,
  discontinue full assemblies, and sell Aftermarket and OEM Pull charging flexes
  separately. The reversible transition is recorded in
  `docs/PRODUCT_STRATEGY_2026-07-29.md`.
- `backglasspros.com` is staged in Cloudflare on the Free plan with nine
  imported Porkbun DNS records. Authoritative nameservers remain at Porkbun.
- Wrangler is authenticated as `blackglassclawd@gmail.com`.
- Worker preview `5ad86beb-a97f-4780-b5e8-54e3eea0b98c` is live at
  `https://backglass-ecommerce.backglasspros.workers.dev`.
- The four iPhone 17 draft models are published for owner review at
  `/review/iphone-17-series`. They are marked not currently offered, excluded
  from checkout, and protected from search indexing.
- Shopify credentials are stored as encrypted Worker secrets. The protected
  audit returns `401` without the admin token and `200` with it.
- Desktop and mobile production checks pass with no horizontal overflow or
  browser console errors. The quick-order check produced 6 units and a
  `$138.00` estimate.

## Current blockers

- Porkbun app-based MFA and recovery codes still require owner completion.
- Customer, discount, shipping, refund, redirect, file, theme-package, app,
  content, and configuration exports remain pending.
- Price-sheet meaning, tier, color coverage, and effective date require owner
  decisions before any Shopify price changes.
- Payment settlement ownership, shipping-label workflow, refund procedure, and
  the owner's daily Shopify Admin tasks require workflow confirmation.
- Installed-app billing, configuration, owned data, and daily usage require
  review before consolidation.
- Headless channel, Customer Account API, and Storefront Cart API credentials
  are not configured.
- The current store has no Shopify B2B companies or wholesale catalogs.
- Twenty-eight full-assembly products remain active in Shopify because the
  migration app has no write scope. The dry-run targets `DRAFT`, not deletion.
- Accurate no-coil interior photos and standalone charging-flex photos are
  pending.
- Production nameserver cutover is intentionally held until the remaining
  migration checks and rollback plan are approved.

## Owner actions

1. Scan Porkbun's app-based MFA QR code and store the recovery codes securely.
2. Answer the price-sheet decision gate in the short-term plan.
3. Confirm payment settlement ownership, shipping, refunds, and the Shopify
   Admin workflows used each day.
4. Approve the Headless channel and B2B pilot configuration.
5. Approve nameserver cutover only after the preview and rollback checklist are
   complete.

Purchases, billing changes, plan activation, and production DNS changes require
the owner to be present.

## Phase gates

### 1. Recovery and capture

- Shopify owner access restored. Complete.
- Domain registered. Complete.
- WHOIS privacy, auto-renew, and registrar lock verified. App-based MFA and
  recovery codes pending.
- Public theme routes, products, content, policies, and media captured.
- Image and media checksums stored with the backup. Complete for public assets.
- Authenticated products, inventory, and orders captured with checksums.
- Customer, discount, shipping, refund, redirect, file, theme-package, app,
  content, and configuration exports remain pending.

### 2. Visual clone

- Public routes and navigation inventoried. Complete.
- Desktop and mobile screenshots captured. Complete.
- Catalog, search, product, pagination, and quick-order behavior reproduced.
- Shopify checkout remains active. Complete.
- Cloudflare Worker preview deployed and production-checked. Complete.
- iPhone 17 review-only draft collection deployed. Complete.

### 3. Synchronization

- Product, price, and inventory webhooks verified with HMAC validation. Pending.
- Queue consumers are idempotent and retry safely. Pending.
- Scheduled bulk reconciliation detects missed webhooks. Pending.
- Every write operation supports dry-run output and an audit record. Pending.

### 4. Headless commerce

- Shopify Headless channel and Storefront API credentials configured. Pending.
- Customer authentication and B2B company-location context verified. Pending.
- Direct cart permalinks replaced with Storefront Cart API operations. Pending.
- Shopify's returned checkout URL preserves buyer context and payment terms.
  Pending.
- Shopify remains the payment, tax, order, refund, and fulfillment authority.
  Approved architecture.

### 5. Controlled launch

- Preview deployment passes visual and functional regression checks. Complete.
- DNS records and rollback TTL are documented.
- Monitoring and alerting are active.
- Shopify remains available as rollback until order parity is confirmed.

### 6. Shopify retirement

- Checkout, payments, tax, shipping, customer accounts, refunds, fulfillment,
  and reporting have approved replacements.
- Customer-data retention and deletion policies are documented.
- No payment credentials are exported from Shopify.
- Final cancellation occurs only after owner approval.

## Safety rules

- Read before write.
- Back up before mutation.
- Never log access tokens, customer data, or webhook secrets.
- Use minimum Shopify scopes.
- Keep production endpoints protected by Cloudflare Access or equivalent.
- Do not deploy from an unreviewed working tree.
