# Back Glass Pros Core

This directory is the canonical local home for the Back Glass Pros business,
storefront migration, source assets, exports, operating knowledge, and archived
prototypes.

## Directory map

- `01-software/` — active applications and automation.
- `02-assets/` — original product media, design files, owner feedback, and brand
  assets.
- `03-data/` — exports and correspondence. Treat this directory as private.
- `10-knowledge/` — business facts, systems, catalog policy, Buzz design, and
  decision records.
- `90-archive/` — inactive prototypes and exact source archives.

Start with [`10-knowledge/BUSINESS.md`](10-knowledge/BUSINESS.md), then read
[`10-knowledge/DECISIONS.md`](10-knowledge/DECISIONS.md) before changing product,
price, inventory, media, publishing, or infrastructure state. Search acquisition
work starts from the dated baseline and approval gates in
[`10-knowledge/SEO-GEO.md`](10-knowledge/SEO-GEO.md).

## Active implementation

The active migration repository is
[`01-software/backglass-ecommerce`](01-software/backglass-ecommerce). Shopify is
still the transaction and operational authority. Cloudflare currently hosts a
preview, not an approved production replacement.

## Safety boundary

The software repository contains ignored secrets and private Shopify exports.
Do not publish `.dev.vars`, `backups/`, customer/order data, costs, margins, or
private correspondence. Public claims and operational changes require owner
approval and current evidence.
