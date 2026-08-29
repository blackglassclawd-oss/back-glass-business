# Prompt Record

Tool: built-in OpenAI image generation/editing tool.

## Model master prompt

Use case: precise-object-edit. Edit the existing Back Glass Pros model image
while preserving the exterior color, model-specific camera geometry, exact
model typography, overlap, scale, centered placement, and white catalog
background. Replace only the exposed interior with a clean half-assembly / no
coil construction based on Michael's reference: exposed segmented circular
magnet ring, metallic heat-dissipating film inside the ring, microphone bracket,
and related preinstalled small parts. Do not include a charging coil, copper
winding, NFC charging flex, charging flex cable, battery, supplier text,
annotation, watermark, or badge.

## Color-variant prompt

Recolor only the exterior back-glass panel and camera surround to the named
store color, using the existing Back Glass Pros color asset as reference.
Preserve the model master's internal construction, camera geometry, exact model
typography, overlap, framing, white background, and lighting. Do not add or
remove parts, badges, watermarks, or extra text.

## Bottom-alignment revision

Edit only the bottom geometry. Make the front exterior back-glass panel and
the exposed internal half-assembly end at the same horizontal bottom baseline.
Keep both bottom corners naturally rounded and preserve the existing white
margin, product scale, overlap, model typography, color, camera geometry,
internal construction, shadows, and lighting. Do not add a Premium or A Grade
badge.

## Deterministic post-processing

The generated images were normalized to 2000 x 2500. No badge assets were
composited. Automated endpoint checks confirmed the left and right product
bottoms differ by no more than five pixels across all 18 images.

No Shopify API or Shopify Admin write was performed.

## Apple-color and camera-opening revision

Edit the existing unbadged half-assembly image while preserving its model,
composition, overlap, no-coil construction, magnet ring, metallic heat film,
small preinstalled parts, model typography, and aligned bottom edges. Use the
corresponding official Apple image only as a color/material reference for the
named finish. Do not copy an Apple logo, complete phone, display, or installed
camera lens from the reference.

Make every large camera aperture on both the exterior panel and visible exposed
interior physically open, with pure white studio background visible through its
center. Keep the surrounding black or metallic rings. Do not fill camera-hole
centers with black, gray, tint, reflection, glass, or lens hardware. Preserve
the smaller flash, microphone, and LiDAR/sensor details as distinct parts.

Do not add a badge, sticker, watermark, border, charging coil, flex cable, or
camera module. Normalize each approved preview to 2000 x 2500 PNG.

Official color references were retained locally under
`reference/apple-official-colors/`. Their source pages are Apple's iPhone 16
technical specifications, iPhone 16 product configurator, and certified
refurbished iPhone 16 Pro listings. They are reference-only and are not
storefront assets.

Final automated checks confirmed 18 PNG files at 2000 x 2500 and left/right
product-bottom deltas no greater than four pixels. Visual review confirmed all
large camera apertures are open/white and no badges are embedded.
