# Design QA: approved Shopify overlays and full color-gallery visibility

## Source truth

- Owner-approved local overlay set: `/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-16-and-17-model-specific-half-assembly-no-coil/2026-08-14/model-name-overlay-awaiting-approval`
- Store placement baseline: `https://backglasspros.com/products/iphone-16-pro-max-half-assembly-no-coil-premium`, owner score 90/100.
- Placement reference capture: `model-name-overlay-awaiting-approval/design-qa/reference-90-iphone-16-pro-max-black.png` (2000 x 2500).
- Exact-model iPhone 17 evidence: `https://www.apple.com/ie/iphone-17/` and Apple's iPhone 17 Recycler Guide.
- New five-color iPhone 17 supplier evidence: `https://www.phonelcdparts.com/apple/iphone-parts/iphone-17?p=3`, with separate magnet-only/no-logo product pages for every color.
- Owner-approved iPhone 17 overlay set: `/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-17-separate-search/2026-08-15/approved-model-name-overlay`.

## Implementation truth

- The earlier 2026-08-14 Shopify application excluded base iPhone 17 by an explicit model assertion while its photography remained unapproved.
- Twelve active products received 48 approved in-place variant-image replacements: iPhone 16, 16 Plus, 16 Pro, 16 Pro Max, 17 Pro, and 17 Pro Max, across A Grade and Premium.
- Read-only Admin and storefront verification passed for all 48 images: READY, assigned to the intended variant, 2000 x 2500 in public product JSON, matching Admin media IDs, and perceptually matching the approved local source.
- After the owner approved the new baseline on 2026-08-15, both active base iPhone 17 products received the five approved shared color media files in place. Ten variant assignments were preserved and verified; all five media records are READY at 2000 x 2500, and public images perceptually match the approved local files.
- Shopify verification artifact: `model-name-overlay-awaiting-approval/shopify-verification-result-excluding-iphone-17.json`.
- A separate iPhone 17 search preserved ten 2068 x 2604 PhoneLCDParts originals—one full exterior/interior composition and one inward-face detail per color—under `/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-17-separate-search/2026-08-14/awaiting-approval/source-originals/phonelcdparts-magnet-only`.
- The approved iPhone 17 set uses the real PhoneLCDParts photos with only proportional white-canvas fitting, the measured model-name text overlay, and JPEG export. No AI generation, recoloring, synthetic reconstruction, or cross-model inward-face reuse was used.
- The published Trade theme now sets `main.hide_variants` to false. Its product gallery snippet also enforces `hide_variant_media = false`, so color-specific variant images remain visible as gallery slides.
- Browser-facing storefront verification passed for all 16 active iPhone 16/17/Air products across A Grade and Premium: 5 slides for iPhone 16, 16 Plus, and 17; 4 for iPhone 16 Pro, 16 Pro Max, and Air; and 3 for iPhone 17 Pro and 17 Pro Max.

## Combined comparison

- Approved family comparison: `model-name-overlay-awaiting-approval/design-qa/reference-versus-full-set-comparison.jpg`.
- Separate iPhone 17 source comparison: `iphone-17-separate-search/2026-08-14/awaiting-approval/design-qa/reference-90-versus-iphone-17-source-comparison.jpg`.
- Five-color iPhone 17 source contact sheet: `iphone-17-separate-search/2026-08-14/awaiting-approval/contact-sheets/iphone-17-phonelcdparts-magnet-only-five-color-source-contact-sheet.jpg`.
- Five-color inward-face detail sheet: `iphone-17-separate-search/2026-08-14/awaiting-approval/contact-sheets/iphone-17-phonelcdparts-magnet-only-inward-face-detail-contact-sheet.jpg`.
- Approved iPhone 17 overlay contact sheet: `iphone-17-separate-search/2026-08-15/approved-model-name-overlay/iphone-17-approved-model-name-overlay-contact-sheet.jpg`.
- Focused 90/100 reference comparison: `iphone-17-separate-search/2026-08-15/approved-model-name-overlay/design-qa/reference-90-versus-approved-iphone-17-overlay.jpg`.

## Findings

| Severity | Finding | Evidence | Resolution | Status |
| --- | --- | --- | --- | --- |
| P0 | Base iPhone 17 must not be uploaded before owner approval. | Owner direction. | Explicitly excluded it from the earlier mutation plan; published only after the owner's 2026-08-15 approval. | Resolved |
| P1 | The prior base iPhone 17 image treatment did not follow the approved family format. | Owner rejection and prior focused comparison. | Replaced it with the approved five-color PhoneLCDParts set using the shared measured typography safe box. | Resolved |
| P1 | Product photography must show model-specific exterior and inward face, exposed magnets, and metallic film without a coil/flex covering the interior. | Owner rules and new five-color contact sheet. | Selected one consistent exact-model supplier set; rejected multi-model, coil/flex-installed, logo-bearing, and previously rejected alternatives. | Resolved |
| P1 | Color variations existed in Shopify but the live gallery rendered only the selected variant image. | Fresh Admin audit showed one image per variant; live product HTML rendered one main gallery item while the modal contained all colors. | Disabled variant-media hiding in the published product template and enforced the same rule in the gallery snippet. | Resolved |
| P2 | The first Shopify apply process exited without writing its final report. | Missing apply-result artifact. | Ran a separate read-only Admin/storefront verifier across every target and both excluded base iPhone 17 products. | Resolved |

## Final result

passed

The approved iPhone 17 set is published and verified on both grades, with all ten variant assignments intact. All 16 active iPhone 16/17/Air product pages now expose every color image in the browser-facing gallery. The final artifacts are `approved-model-name-overlay/shopify-publish-verification-result.json` and `data/shopify-gallery-visibility-verification-2026-08-15.json`.

---

# Latest Design QA: iPhone 17e and MagSafe coil review pack

## Source visual truth

- Owner baseline: `/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-16-and-17-model-specific-half-assembly-no-coil/2026-08-14/model-name-overlay-awaiting-approval/design-qa/reference-90-iphone-16-pro-max-black.png` (2000 x 2500), scored 90/100.
- Exact-model iPhone 17e source truth: three 2500 x 2500 MobileSentrix Genuine OEM photographs for Black, White, and Soft Pink.
- Michael identification truth: 22 Drive photographs indexed by `/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/nfc-charging-coils/2026-08-09/reference-inventory.tsv`. They were inspected for identity only; no Michael pixels were used.

## Implementation truth

- Review root: `/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-17e-and-magsafe-coils/2026-08-15/awaiting-approval`.
- iPhone 17e outputs: 2000 x 2500, exact-model source photo, measured `17e` overlay, unchanged source colors.
- Coil outputs: 14 Michael-mapped models, 2000 x 2500 lossless PNGs rebuilt from supplier originals.
- Full comparison: `design-qa/reference-90-versus-iphone-17e-full-comparison.jpg` (1600 x 1104).
- Focused comparison: `design-qa/focused-inward-face-no-coil-compliance-comparison.jpg` (1400 x 1000).
- State: local review only; Shopify upload false.

## Required fidelity surfaces

- Fonts and typography: Helvetica Neue/Helvetica/Arial, weight 700, established cyan-to-lavender gradient at 0.82 opacity, measured safe box centered at x=530 and y=900.
- Spacing and layout rhythm: 2000 x 2500 canvas; model text remains on the exterior half.
- Colors and visual tokens: source colors are untouched; no variant was recolored.
- Image quality and asset fidelity: real exact-model/supplier photographs, no AI generation, no synthetic reconstruction, and no cross-model inward-face reuse.
- Copy and content: `17e`; Black, White, and Soft Pink.

## Findings

- [P1] All available exact-model iPhone 17e sources are full assemblies with the coil/flex installed. They do not expose the required magnets and metallic heat film.
- [P1] The exact MobileSentrix iPhone 17e standalone-coil listing has placeholder media. The separate iPhone 16e image URL is not acceptable as iPhone 17e product photography.

## Comparison history

- Pass 1: typography, placement, dimensions, color fidelity, and the 14 mapped coil images passed.
- Pass 1 blockers retained: exact iPhone 17e no-coil inward face and exact standalone iPhone 17e coil. No synthetic workaround was attempted.

## Final result

blocked

The complete latest report is `/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-17e-and-magsafe-coils/2026-08-15/awaiting-approval/design-qa/design-qa.md`.

---

# Latest correction: rejected iPhone 17e coil-installed media removed

## Source visual truth

- Owner baseline: `/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-16-and-17-model-specific-half-assembly-no-coil/2026-08-14/model-name-overlay-awaiting-approval/design-qa/reference-90-iphone-16-pro-max-black.png`.
- Approved standard-model implementation: `/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-16-and-17-model-specific-half-assembly-no-coil/2026-08-14/model-name-overlay-awaiting-approval/images/iphone-17/iphone-17-black-half-assembly-no-coil-model-name-overlay-review.jpg`.
- Exact iPhone 17e listings screened: MobileSentrix exact-model full assemblies, a low-resolution shared 16e/17e aftermarket listing, iFixit teardown evidence, and current MacFactory, REWA, Injured Gadgets, and GadgetFix catalogs.

## Current implementation truth

- Active iPhone 17e product-image candidate count: 0.
- Rejected coil-installed iPhone 17e files were moved outside the active review set to `/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-17e-and-magsafe-coils/2026-08-15/rejected-full-assembly-with-coil`.
- Source-screening evidence: `/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-17e-and-magsafe-coils/2026-08-15/awaiting-approval/iphone-17e/source-review/source-screening-2026-08-15.json`.
- The former builder now stops immediately with a retired-source error, preventing accidental regeneration.
- Shopify upload remains false.

## Required fidelity surfaces

- Fonts and typography: future `17e` output must reuse the approved font, measured exterior safe area, and cyan-to-lavender treatment.
- Spacing and layout rhythm: 2000 x 2500 canvas, with the model label confined to the exterior panel.
- Colors and visual tokens: real Black, White, and Soft Pink source photos; no recoloring.
- Image quality and asset fidelity: exact iPhone 17e inward face, exposed magnet array, metallic heat-dissipating film, and no charging/NFC/flashlight flex. No cross-model substitution or synthetic editing.
- Copy and content: `17e`.

## Findings

- [P1] No exact-model no-coil iPhone 17e product photograph currently passes the approved visual standard.
- [P1] Exact-model public listings currently show the coil/flex installed; magnet-only alternatives are wrong-model or inadequately documented.

## Comparison history

- Pass 1 failed: exact-model but coil-installed imagery.
- Pass 2 corrected the active review set by removing all rejected candidates and retaining only the evidence record.
- Pass 2 remains blocked until exact iPhone 17e no-coil inward photography is available.

## Final result

blocked
