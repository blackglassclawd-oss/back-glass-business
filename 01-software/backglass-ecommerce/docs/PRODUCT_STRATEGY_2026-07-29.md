# Product Strategy Decision

> Historical decision record. The 2026-08-29 catalog direction supersedes the
> `OEM Pull` charging-flex naming and one-product/two-variant design. Current
> direction is separate standalone `OEM` and `Aftermarket` Wireless Charging
> Coil product drafts, with no invented SKU, price, inventory, or media.

## Owner direction

Recorded July 29, 2026 from the product owner's messages:

- Stop offering full back-glass assemblies.
- Continue offering Premium and A Grade half assemblies without a wireless
  charging coil.
- Sell the Wireless NFC Charging Flex With Flashlight Flex Cable separately.
- Each charging-flex product should offer `Aftermarket` and `OEM Pull` options.
- A customer who needs a full assembly can combine a half assembly with the
  selected charging flex.
- Half-assembly thumbnails must not use a full-assembly interior photo that shows
  a wireless charging coil.

Source screenshots:

- `/Users/jason/Downloads/IMG_6036.jpg`
- `/Users/jason/Downloads/IMG_6037.PNG`
- `/Users/jason/Downloads/e1f957f0a468f9880ba4e5226b762055.PNG`
- `/Users/jason/Downloads/ec7ea08b842a3eefe798a13e808fb652.JPG`

## Live Shopify audit

Observed July 29, 2026:

| Product group | Products | Variants | Current state | Target state |
| --- | ---: | ---: | --- | --- |
| Half assembly, no coil | 20 | 96 | Active | Keep active |
| Full assembly, with coil | 28 | 126 | Active; 12 published, 16 unpublished | Draft, never delete |
| Charging flex | 0 | 0 | Missing | Create 15 draft products with 30 variants |

All audited half- and full-assembly products report zero tracked aggregate
inventory. Inventory policy and actual available stock require confirmation
before publication.

## Charging-flex model

Create one product per phone model:

`<Model> Wireless NFC Charging Flex With Flashlight Flex Cable`

Product option:

- Option name: `Part source`
- Variant 1: `Aftermarket`
- Variant 2: `OEM Pull`

SKU pattern:

- `SKU-<MODEL>-NFC-FLEX-AM`
- `SKU-<MODEL>-NFC-FLEX-OEM-PULL`

The July 28 price sheet covers 15 models from iPhone 14 through iPhone 17.
Blank prices remain pending and do not receive invented values.

## Image handling

The Shopify file audit found 542 files but no complete, accurate replacement set
showing the no-coil interior for the half assemblies. Representative iPhone 14
and iPhone 15 half-assembly images visibly show the charging coil.

The additional desktop and mobile screenshots confirm that Shopify's quick-order
surface renders the `featured_image` assigned to each variant. This is separate
from the product hero image. All 96 half-assembly variants currently have an
assigned featured image, so remediation must be tracked at the variant level.
The screenshots specifically show the four iPhone 16 Pro Premium variants and
the Black and White iPhone 16 Premium variants.

Temporary preview behavior:

- preserve the exterior color reference
- hide the coil-bearing interior half of the image
- display `No-coil interior - Photo pending`
- remove the misleading thumbnail strip from half-assembly product pages

Shopify remediation behavior:

- preserve the current color-specific exterior reference until its replacement
  is ready
- replace each variant assignment with a verified image for the same model,
  grade, and color
- do not detach images as an interim fix because the quick-order app may fall
  back to another product image
- keep products active while the replacement set is prepared

Do not use generated product imagery. Accurate supplier or warehouse photos are
required before final publication.

## Write controls

- The current Shopify migration app remains read-only.
- `npm run plan:catalog-transition` creates a timestamped dry-run plan.
- The plan contains 28 reversible status updates, 15 draft product creates, 96
  blocked variant-image replacements, and zero deletes.
- Shopify writes require `write_products`, a fresh backup, reviewed diffs, and
  owner approval.
