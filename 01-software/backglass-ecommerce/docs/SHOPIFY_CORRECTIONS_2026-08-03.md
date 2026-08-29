# Shopify Corrections

## Execution order

Apply and review these changes in Shopify first. Cloudflare remains on the
pre-transition catalog until the Shopify result is approved.

## Confirmed catalog corrections

- Correct `Alpine Greeen` to `Alpine Green` on the iPhone 13 Pro Max Premium
  variant. Keep its SKU unchanged.
- Move all 28 Full Assembly products to Draft. Delete nothing.
- Move the iPhone XS Max A Grade product to Draft. XS Max has no separate A
  Grade offer; keep the Premium product.
- Change the copied iPhone 16 Pro Max Premium handle to
  `iphone-16-pro-max-half-assembly-no-coil-premium` and preserve a redirect from
  the old handle. Its title, description, and `premium` tag are already correct.
- Ensure the iPhone 16 Pro Max Premium product displays a Premium badge, not an
  A Grade badge.
- Create the 15 charging-flex products as unpublished drafts with Aftermarket
  and OEM Pull variants. Blank prices remain pending.

## Media interpretation

The newly annotated screenshots clarify that the circular component on the
iPhone 14/15 half-assembly imagery is a heat-dissipation film, not the NFC
charging coil. Do not remove it through an exterior-only crop.

- iPhone 14 Plus: add or show the annotated heat-dissipation film on the hero
  and the marked Blue, Purple, and Starlight thumbnails. Leave Midnight alone.
- iPhone 15 Pro Max: use an image labeled `15 PRO MAX`, not `15 PRO`, and change
  the marked heat-dissipation film from gold or beige to silver on the hero plus
  Natural, Black, and Blue. Leave White alone.
- iPhone 15: show the annotated silver graphene heat-dissipation film on the
  hero plus Blue, Green, and Pink. Leave unmarked variants alone.
- iPhone 16 Pro: replace the marked hero/interior imagery and Desert, Natural,
  and White thumbnails with verified half-assembly photography. Leave Black
  alone.
- iPhone 16 Pro Max: make the same marked media corrections for Desert, Natural,
  and White, and display the Premium badge. Leave Black alone.

Do not use generated product imagery. Do not reuse Full Assembly media on a
Half Assembly variant. Keep every variant's model, grade, and color association
explicit.

## Evidence

The structured execution record is
`data/catalog/shopify-corrections-2026-08-03.json`. The fresh pre-write backup is
`backups/admin/2026-08-03T05-41-04.114Z`.
