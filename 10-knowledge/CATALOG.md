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
- The entire iPhone 14 series is **Glass Only** in this catalog. There is no
  iPhone 14 half assembly of any grade, including iPhone 14 Pro Max. This is
  intentional product architecture, not missing data, and must never be reported
  as a media or sourcing blocker.
- Premium Plus is a third back-glass grade recorded on 2026-09-09 by Jason and
  awaiting Michael's confirmation. It reuses the Premium half-assembly product
  logic and exists only for **iPhone 15 Pro Max, iPhone 16 Pro Max and iPhone 17
  Pro Max** (corrected 2026-09-10 from the earlier 14-17 range, because the
  iPhone 14 series is Glass Only). The only stated difference is the camera lens:
  "Sapphire glass camera lens" and "OEM-quality camera lens". OEM-quality is a
  stated standard, not evidence of Apple origin or OEM supply, and no durability,
  optical, scratch-resistance, pricing or warranty difference is established.
  Eligibility, wording and publication blockers live in
  [`../01-software/backglass-ecommerce/data/catalog/premium-plus-grade-2026-09-09.json`](../01-software/backglass-ecommerce/data/catalog/premium-plus-grade-2026-09-09.json).
  Premium Plus exists only as unpublished Shopify drafts with no price, SKU or
  inventory. Michael's 2026-09-12 approval of the iPhone 17 series satisfies the
  owner review for the iPhone 17 Pro Max draft only.
- On 2026-09-12 Michael reviewed the iPhone 17 series and approved it for
  publication, approved adding **iPhone 17e Back Glass**, and allowed the first
  17e listing to use iPhone 16e imagery temporarily, knowing the 16e part has no
  magnets and the 17e part does. Owner review is not a price, stock, media-rights
  or coil decision. Only iPhone 17 A Grade ($12) and Premium ($18) have approved
  prices. 17 Pro, 17 Pro Max and Air stay blocked on price, Air also on its
  full-assembly imagery, and 17 Pro / Pro Max A Grade stay withdrawn. iPhone 17e
  is Premium-only Half Assembly (No Coil) in Black, White and Soft Pink, with no
  price yet. No iPhone 16e image exists anywhere, so the reuse cannot happen
  until one is supplied; model-specific 17e photography should replace it
  later. Canonical record:
  [`../01-software/backglass-ecommerce/data/catalog/iphone-17-series-owner-approval-2026-09-12.json`](../01-software/backglass-ecommerce/data/catalog/iphone-17-series-owner-approval-2026-09-12.json).
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

- **Media evidence is not compatibility evidence.** A filename, a model-named
  image, or a supplier page that matches a model never establishes physical
  fitment. Compatibility status changes only on Michael's verification.
- Vendor-derived imagery (MobileSentrix, Phone LCD Parts, Injured Gadgets and
  similar) is **temporary internal reference only** until rights are cleared and
  Michael approves the exact presentation. It must never be uploaded to Shopify,
  including onto draft products: Shopify CDN files are publicly reachable even
  when the product itself is unpublished.
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

- Define Premium, A Grade and Premium Plus objectively, including what evidence
  supports the sapphire glass and OEM-quality camera-lens description.
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
