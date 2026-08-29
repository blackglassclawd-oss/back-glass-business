# Design QA: iPhone 17e no-coil correction and MagSafe coil review pack

## Source visual truth

- Owner baseline: `/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-16-and-17-model-specific-half-assembly-no-coil/2026-08-14/model-name-overlay-awaiting-approval/design-qa/reference-90-iphone-16-pro-max-black.png` (2000 x 2500), scored 90/100.
- Approved no-coil implementation reference: `/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-16-and-17-model-specific-half-assembly-no-coil/2026-08-14/model-name-overlay-awaiting-approval/images/iphone-17/iphone-17-black-half-assembly-no-coil-model-name-overlay-review.jpg`.
- Rejected iPhone 17e source state: MobileSentrix exact-model photos with the charging coil/NFC/flashlight flex installed.
- Michael identification source: 22 Drive photographs indexed by `/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/nfc-charging-coils/2026-08-09/reference-inventory.tsv`; identification only, zero Michael pixels in outputs.

## Current implementation state

- iPhone 17e active product-image candidate count: 0.
- Rejected full-assembly images and their comparisons were removed from the active review folder and retained under `../rejected-full-assembly-with-coil/` for traceability.
- Source-screening evidence: `iphone-17e/source-review/source-screening-2026-08-15.json`.
- Coil output state: 14 Michael-mapped models, 2000 x 2500 lossless PNGs.

## Required fidelity surfaces

- Fonts and typography: a future compliant candidate must reuse Helvetica Neue/Helvetica/Arial, weight 700, the measured exterior safe area, and the approved cyan-to-lavender gradient.
- Spacing and layout rhythm: a future candidate must retain the 2000 x 2500 canvas and keep the `17e` label entirely on the exterior panel.
- Colors and visual tokens: Black, White, and Soft Pink must come from real color-specific photos; no recoloring.
- Image quality and asset fidelity: the inward face must be exact iPhone 17e and visibly expose the magnet array and metallic heat-dissipating film. No coil/flex, AI generation, object removal, reconstruction, or cross-model substitute is allowed.
- Copy and content: model label is `17e`; official colors are Black, White, and Soft Pink.

## Findings

- [P1] No exact-model iPhone 17e no-coil source passed the approved visual standard.
  - Location: `iphone-17e/source-review/source-screening-2026-08-15.json`.
  - Evidence: exact-model sources show the charging coil/flex installed; the only magnet-only alternatives are labeled iPhone 16e or shared 16e/17e and do not provide an acceptable exact-model inward photograph.
  - Impact: creating or publishing a candidate now would repeat the rejected coil-installed or cross-model error.
  - Fix: obtain a real exact iPhone 17e inward-face product photo with exposed magnets and metallic film, then reuse it only across iPhone 17e color variants.
- [P1] No high-fidelity standalone iPhone 17e coil photo is currently available from the exact MobileSentrix listing.
  - Location: iPhone 17e coil slot.
  - Evidence: exact-model and 16e/17e-compatible MobileSentrix pages currently return placeholder product media; a separate Maya image URL is listed as iPhone 16e and is recorded only as research evidence.
  - Impact: assigning either image to iPhone 17e would overstate model certainty or image quality.
  - Fix: obtain an exact-model standalone 17e coil/flex supplier original, then compare its connector and shield geometry against Michael's reference and the iFixit teardown.

## Comparison history

- Pass 1: the former iPhone 17e implementation failed the no-coil surface.
- Pass 2: all rejected iPhone 17e product candidates were removed from the active review set; no cross-model or synthetic replacement was introduced.
- Pass 2 blocker retained: exact iPhone 17e no-coil inward-face photography is still missing. The 14 mapped standalone coil photos remain available for owner review.

## Final result

blocked
