# Catalog

## Current evidence sets

| Evidence | Date | Scope | Use |
| --- | --- | --- | --- |
| Public storefront snapshot | 2026-07-26 | 66 products, 312 variants | Public catalog and media baseline |
| Authenticated Shopify export | 2026-08-06 | 84 product roots, 384 inventory roots | Current private reconciliation baseline |
| Legacy Shopify CSV exports | 2024-12 | 358, 358, and 472 data rows | Historical reference only |
| Owner price-sheet image and transcription | 2026-07-28 | Proposed model/part prices | Staging only until price semantics are confirmed |
| Product-strategy owner screenshots | 2026-07-28/29 | Assembly and charging-flex direction | Catalog policy evidence |
| Owner media email | 2026-08-06 | Supplier-image suitability feedback | Media review evidence |

## Recorded product direction

- Stop offering full back-glass assemblies; move them to Draft and delete
  nothing.
- Continue Premium and A Grade half assemblies without the wireless charging
  coil.
- Offer the wireless NFC charging flex with flashlight flex separately.
- Give charging-flex products `Aftermarket` and `OEM Pull` variants.
- A full set may be assembled by buying the half assembly and appropriate flex.

This is recorded owner direction. A fresh Shopify audit must confirm how much of
it has actually been applied.

## Media policy

- Preserve explicit model, grade, color, assembly, and coil associations.
- Do not use generated product imagery.
- Do not use Full Assembly imagery to represent a Half Assembly.
- Use verified supplier or warehouse photography before final publication.
- Variant-level image assignments matter because the Quick Order surface uses
  each variant's featured image.

Michael's 2026-08-06 email says the available MobileSentrix photos were either
full assemblies with wireless charging or half assemblies lacking the expected
heat-dissipation film. He suggested evaluating a PhoneLCDParts iPhone 15 Pro Max
image and attached another reference. This is feedback to evaluate imagery, not
a license grant or publication approval.

## Required purchasable-variant fields

- Device: brand, family, model, generation, regional compatibility.
- Part: type, assembly, coil status, camera configuration.
- Quality: grade, materials/process, color tolerance, QC status.
- Included: adhesive, lens, frame, coil, flex, tools, packaging.
- Commerce: SKU, barcode, cost, selling price, MOQ, increment, tier prices.
- Inventory: location, available, reserved, ETA, last synchronization.
- Logistics: weight, dimensions, hazardous status, ship class.
- Support: warranty, RMA window, evidence, disposition.
- Content: title, fitment notes, concise description, image alt text.

## Hard decision gates

- Define Premium and A Grade objectively.
- Decide whether the staged sheet contains costs or selling prices.
- Decide whether sheet prices apply to all colors and replace current prices.
- Confirm physical stock and inventory tracking before publication.
- Obtain image rights and product-owner approval for every replacement source.
- Tie shipping, quality, warranty, and availability claims to current evidence.

## Source documents

- [`../01-software/backglass-ecommerce/docs/PRODUCT_STRATEGY_2026-07-29.md`](../01-software/backglass-ecommerce/docs/PRODUCT_STRATEGY_2026-07-29.md)
- [`../01-software/backglass-ecommerce/docs/SHOPIFY_CORRECTIONS_2026-08-03.md`](../01-software/backglass-ecommerce/docs/SHOPIFY_CORRECTIONS_2026-08-03.md)
- [`../01-software/backglass-ecommerce/docs/SHORT_TERM_PLAN_2026-07-28.md`](../01-software/backglass-ecommerce/docs/SHORT_TERM_PLAN_2026-07-28.md)
- [`../03-data/owner-correspondence/2026-08-06/重发网站问题.eml`](../03-data/owner-correspondence/2026-08-06/重发网站问题.eml)


## iPhone 17, iPhone 18 and coil launch (2026-10-10)

Jason's priorities: iPhone 17 series ready to sell, iPhone 18 series drafted,
coils live. Live Shopify state on 2026-10-10:

- iPhone 17, Air, 17 Pro, 17 Pro Max and 17e half assemblies exist as Draft.
  Their SKUs end in `-FA` (full assembly) and need `-HA`. A Grade Air, 17 Pro
  and 17 Pro Max are $0; 17 Pro and 17 Pro Max Premium are $10, below the
  iPhone 16 Premium ($15); Air Premium is $60. 17e has no price or photos.
- 30 wireless charging coil products (iPhone 14 to 17 Pro Max, OEM and
  Aftermarket) exist as Draft at $0 with no photos or SKUs.
- No iPhone 18 products exist. Apple released iPhone 18 Pro and 18 Pro Max
  on 2026-09-18; base iPhone 18 and 18e are expected in spring 2027.

Change set: [`launch-iphone17-18-coils-2026-10-10.json`](../01-software/backglass-ecommerce/data/catalog/launch-iphone17-18-coils-2026-10-10.json),
applied by `scripts/shopify-launch-iphone17-18-coils-2026-10-10.ts` (dry run
unless `--apply`). Proposed coil prices are Claude's, from the store's own old
Full minus Half Assembly gap; only `approvedPrice` values are written, and
Full Assemblies stay in Draft.
