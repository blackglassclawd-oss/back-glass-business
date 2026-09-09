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
- Offer Wireless Charging Coils as standalone products, separate from Back
  Glass.
- Create separate `OEM` and `Aftermarket` product drafts for each verified
  model. Do not reuse the former Full Assembly product identity or SKU.
- Do not publish a coil until selling price, inventory, SKU, compatibility,
  included components, grade definition, model-specific media rights, and
  Michael's product/media approval are complete.
- The verified draft mapping covers 15 models across iPhone 17, 16, 15, and 14.
  Jason directed that iPhone 17e be included as an unavailable draft even
  though its model-specific image and commercial fields remain blocked. iPhone
  16e remains blocked for lack of an approved source. No iPhone 14 Pro or Pro
  Max coil listing is established.

The 2026-09-01 production correction verified all 28 Full Assembly records as
Draft without deletion. The Extend Commerce collections and rules were
preserved unchanged.

## Media policy

- Preserve explicit model, grade, color, assembly, and coil associations.
- Do not use generated product imagery.
- Do not use Full Assembly imagery to represent a Half Assembly.
- Use rights-cleared, model-specific photography approved by Michael before
  final publication.
- Variant-level image assignments matter because the Quick Order surface uses
  each variant's featured image.

Michael's 2026-08-06 email says the available supplier photos did not fully
match the intended configurations. This is feedback to evaluate imagery, not a
license grant or publication approval.

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
