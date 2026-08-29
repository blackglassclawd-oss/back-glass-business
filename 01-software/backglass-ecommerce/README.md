# Back Glass Pros Ecommerce Migration

Cloudflare-hosted storefront and operations automation for the Shopify store
`kfczyu-kc.myshopify.com`.

The current implementation provides a paginated storefront clone backed by a
captured catalog, product and quick-order routes, a migration console, public
availability checks, protected Shopify diagnostics, and timestamped snapshots.
Shopify remains the system of record and handles cart, checkout, and orders
until explicit cutover approval.

The backend, payment, B2B, and management-parity decision is documented in
[`docs/BACKEND_AND_PAYMENTS.md`](docs/BACKEND_AND_PAYMENTS.md).

Preview: `https://backglass-ecommerce.backglasspros.workers.dev`

iPhone 17 owner review:
`https://backglass-ecommerce.backglasspros.workers.dev/review/iphone-17-series`

Catalog transition review:
`https://backglass-ecommerce.backglasspros.workers.dev/review/catalog-transition`

## Prerequisites

- Node.js 22.22 or newer (`.node-version` pins 22.23.1)
- A recovered and active Shopify owner account
- A Shopify app created by the store owner with approved read scopes
- A verified Cloudflare account before deployment

## Local setup

```bash
npm install
npm run typecheck
npm test
npm run test:e2e
npm run dev
```

The local application runs at `http://localhost:5173`.

## Capture And Audits

Capture the public catalog, routes, theme assets, product media, and checksums:

```bash
npm run capture:storefront
```

The sanitized current catalog is published to `data/storefront/`. Raw HTML,
media, and immutable manifests are written under `backups/storefront/`, which is
excluded from Git.

Public domain and storefront status requires no credentials:

```bash
npm run audit:public
```

Authenticated Shopify metadata requires values in `.dev.vars`:

```bash
npm run audit:shopify
```

Audit commands also write timestamped JSON under `backups/`.

## Secrets

Copy values into `.dev.vars` only. Never commit or paste credentials into source
files.

- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`
- `MIGRATION_ADMIN_TOKEN`

Cloudflare production secrets are configured on the current Worker. Use
`wrangler secret bulk` or `wrangler secret put` when rotating them.

## Protected API

`GET /api/shopify/status` returns the same read-only shop audit as the CLI when
called with:

```text
Authorization: Bearer <MIGRATION_ADMIN_TOKEN>
```

It returns `401` without the configured bearer token and `503` while the admin
token or Shopify credentials are unconfigured.

## Verification

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
npm audit --omit=dev
```

See [docs/MIGRATION_RUNBOOK.md](docs/MIGRATION_RUNBOOK.md) for ownership,
recovery, backup, and cutover gates.
