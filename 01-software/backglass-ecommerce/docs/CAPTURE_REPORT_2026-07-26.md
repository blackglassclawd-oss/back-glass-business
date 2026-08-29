# Storefront Capture Report

## Source

- Store: `https://kfczyu-kc.myshopify.com`
- Captured: July 26, 2026
- Snapshot:
  `backups/storefront/2026-07-26T06-22-52.172Z`

## Results

- Products: 66
- Variants: 312
- Public routes: 83
- Assets discovered: 682
- Assets downloaded: 682
- Asset failures: 0
- Snapshot size: approximately 273 MB

The raw snapshot contains Shopify sitemap XML, public route HTML, catalog JSON,
media and theme assets, and a manifest with source URLs, byte sizes, content
types, and SHA-256 checksums. Raw artifacts are excluded from Git.

## Visual Baseline

Desktop and mobile screenshots of the restored Shopify storefront are under
`output/playwright/`. The source storefront currently exposes:

- A BSS app-extension error: `"undefined" is not valid JSON`.
- Loyalty, chat, and shipping popups that obscure catalog content.
- Lazy-loaded cards that do not render until scrolled into view.

The clone intentionally omits those third-party overlays and keeps checkout on
Shopify.

## Private Data Pending

The public capture does not include inventory quantities, orders, customers,
fulfillments, unpublished products, redirects, installed apps, navigation
configuration, complete Files data, or a downloadable theme package. These
require signed Shopify Admin or Admin API access.
