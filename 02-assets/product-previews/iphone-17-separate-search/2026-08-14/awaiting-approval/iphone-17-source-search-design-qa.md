# iPhone 17 separate source search design QA

## Source truth

- Store placement baseline: https://backglasspros.com/products/iphone-16-pro-max-half-assembly-no-coil-premium (owner score: 90/100).
- Apple model evidence: https://www.apple.com/ie/iphone-17/ confirms the base iPhone 17 vertical dual-camera exterior and five colors.
- Apple component evidence: https://www.apple.com/vn/recycling/recycler-guides/pdf/products/iphone/iPhone_17_Recycler_Guide_English.pdf identifies the iPhone 17 back glass as a distinct removable component.
- Supplier evidence: https://www.phonelcdparts.com/apple/iphone-parts/iphone-17?p=3 lists explicit magnet-only, no-logo base iPhone 17 products in Black, White, Mist Blue, Sage, and Lavender. Each color has a 2068 x 2604 full exterior/interior composition and a separate 2068 x 2604 inward-face detail photograph.

## Implementation truth

- The ten supplier originals are preserved byte-for-byte under `source-originals/phonelcdparts-magnet-only/` with SHA-256 hashes in `iphone-17-source-evidence-manifest.json`.
- Each photo shows the correct base-model dual-camera exterior beside a complete inward face.
- The inward face visibly exposes segmented magnets and metallic film inside the circle; no wireless coil or flex overlays the photographed interior.
- All five sources use the same scale, vertical alignment, camera framing, and white background.
- No AI generation, recoloring, synthetic reconstruction, or model-name overlay was applied.
- Nothing from this source set was uploaded to Shopify.
- Multi-model, coil/flex-installed, logo-bearing, and previously rejected candidates are recorded in the manifest and excluded from the selected set.

## Combined comparison

- `design-qa/reference-90-versus-iphone-17-source-comparison.jpg` places the 90/100 store reference and the new raw iPhone 17 source in one frame.
- `contact-sheets/iphone-17-phonelcdparts-magnet-only-inward-face-detail-contact-sheet.jpg` places all five exact-model inward-face closeups on one canvas for direct geometry comparison.
- The new source resolves the prior iPhone 17 inconsistency at the photography layer: exterior and interior are both full-height, non-overlapping, and consistently aligned.
- The model-name overlay remains intentionally pending owner approval; it must later use the same measured label box as the approved series rather than the rejected iPhone 17 placement.

## Final result

passed (source-screening stage only; Shopify remains blocked pending owner approval)
