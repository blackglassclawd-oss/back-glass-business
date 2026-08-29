# Back Glass Pros Security Review

Date: 2026-07-28

## Executive Summary

No critical vulnerability or exposed secret was found. Production dependencies
are clean. Two confirmed weaknesses were fixed during the review: vulnerable
Cloudflare development tooling and missing browser/security-cache headers.

The main open launch risk is the operator-only Shopify audit endpoint. Its bearer
token is compared in constant time and the endpoint is read-only, but it still
needs Cloudflare Access and path-specific rate limiting before the custom domain
is treated as production.

Scope: repository code, dependency manifests, secret hygiene, Cloudflare Worker
configuration, and passive requests against the public preview. This was not an
intrusive penetration test of Shopify or Cloudflare.

## Critical

No critical findings.

## High

### SEC-001 - Cloudflare development toolchain advisory - Resolved

- Severity: High in development/build environments; not present in production
  dependencies.
- Location: `package.json:35`, `package.json:49`, `package-lock.json`.
- Evidence: `npm audit` originally reported the `sharp` libvips advisory
  `GHSA-f88m-g3jw-g9cj` through `miniflare`, Wrangler 4.113.0, and
  `@cloudflare/vite-plugin` 1.46.0.
- Impact: Processing a malicious image with the affected local build tooling
  could expose the developer environment to the upstream libvips flaws.
- Fix: Updated `@cloudflare/vite-plugin` to 1.47.0 and Wrangler to 4.114.0.
- Verification: Full and production-only `npm audit` now report zero
  vulnerabilities.

## Medium

### SEC-002 - Missing browser security policy and headers - Resolved

- Severity: Medium.
- Location: `app/services/security-headers.server.ts:1`,
  `app/entry.server.tsx:16`, `workers/app.ts:11`.
- Evidence: The deployed preview originally lacked CSP, clickjacking,
  MIME-sniffing, referrer, and permissions headers.
- Impact: A future injection defect would have had a larger browser-side blast
  radius, and the storefront could be framed by another site.
- Fix: Added a per-response nonce CSP, `frame-ancestors 'none'`,
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, and a restrictive `Permissions-Policy`.
- Verification: Production-mode Chromium loaded and hydrated without CSP or
  console errors on desktop and mobile.

### SEC-003 - Operator API lacks edge identity and abuse controls - Open

- Severity: Medium.
- Location: `app/routes/api.shopify-status.ts:18`,
  `app/services/admin-auth.server.ts:1`, `workers/app.ts:15`.
- Evidence: `/api/shopify/status` accepts a bearer token but has no
  repository-visible rate limit or Cloudflare Access policy.
- Impact: Requests can consume Worker and Shopify Admin API capacity. A leaked
  bearer token would grant access until it is rotated.
- Existing mitigation: Long secret token, constant-time comparison, read-only
  Shopify scopes, method restrictions, and `Cache-Control: no-store` on every
  path response.
- Required launch fix: Put only `/api/shopify/status` behind Cloudflare Access,
  add a path-specific rate limit for authorized and unauthorized requests, and
  rotate the bearer token at launch.
- False-positive notes: Cloudflare dashboard policies are outside this
  repository and might already provide part of this control; verify in the
  dashboard.

## Low

### SEC-004 - Public migration page exposes operational state - Open

- Severity: Low.
- Location: `app/routes/home.tsx:14`.
- Evidence: `/migration` discloses whether Shopify credentials are configured,
  the API version, mode, store domain, and stale migration blockers.
- Impact: This provides minor reconnaissance and can expose outdated internal
  status to customers.
- Fix: Place `/migration` behind the same Cloudflare Access application as the
  audit endpoint, or remove it from the public deployment.

### SEC-005 - Catalog image URLs are trusted without runtime validation - Mitigated

- Severity: Low and conditional.
- Location: `app/data/catalog.server.ts:7`,
  `app/data/catalog.shared.ts:72`, `app/components/product-card.tsx:20`,
  `app/routes/product.tsx:47`.
- Evidence: Shopify snapshot image URLs are type-cast and passed to `<img src>`
  without schema validation.
- Impact: A compromised catalog refresh could trigger browser requests to an
  unintended image host.
- Existing mitigation: The enforced CSP restricts images to this origin, data
  images, and `cdn.shopify.com`. All 310 current catalog image URLs use the
  expected HTTPS Shopify CDN host.
- Follow-up: Validate catalog JSON and allowlist HTTPS Shopify CDN URLs during
  snapshot ingestion.

### SEC-006 - Cart URL helper relies on trusted callers - Open hardening

- Severity: Low and conditional.
- Location: `app/data/quick-order.shared.ts:65`,
  `app/routes/quick-order.tsx:82`.
- Evidence: The helper concatenates its origin, variant IDs, and quantities.
- Impact: A future caller that supplies untrusted values could create malformed
  or unintended navigation.
- Existing mitigation: The only current caller supplies a fixed HTTPS Shopify
  origin and variant IDs from the captured catalog. No open redirect is
  currently reachable.
- Follow-up: Remove the origin parameter, validate safe integer IDs and bounded
  quantities, and construct the URL with the `URL` API.

## Verified Controls

- Local secrets are mode `0600`; backups are mode `0700`.
- `.dev.vars`, backups, builds, reports, and generated Worker types are ignored.
- The post-build sanitizer removes `.dev.vars` from the server bundle.
- Pattern-based secret scanning found no committed credential or private-key
  signatures.
- The protected endpoint rejects unauthorized access and state-changing methods.
- All 19 unit tests and all 12 desktop/mobile browser tests pass.

## Launch Gates

1. Protect `/migration` and `/api/shopify/status` with Cloudflare Access.
2. Add a path-specific rate limit to `/api/shopify/status`.
3. Rotate `MIGRATION_ADMIN_TOKEN` after Access is active.
4. Re-run this review after order, customer, inventory, or write-capable
   automation endpoints are introduced.
