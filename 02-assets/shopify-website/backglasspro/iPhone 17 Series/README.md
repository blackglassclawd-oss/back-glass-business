# iPhone 17 Series

Supplier product photography prepared for Shopify. No generative AI was used,
but one earlier deterministic recolor is disqualified as noted below.

- `source/` contains the original downloaded WebP files.
- `shopify-ready/` contains white-background, 2000 x 2500 JPEGs.
- Every filename ending in `-fa.jpg` is for a Full Assembly (With Coil)
  variant.
- `prepare_iphone17_images.py` reproduces the deterministic crop, resize,
  white-background composite, and JPEG export.

Important: `shopify-ready/iphone-17-pro-max-silver-fa.jpg` is disqualified. It
was produced by recoloring the Deep Blue iPhone 17 Pro Max photograph and must
not be used or uploaded. The 350 x 350 MobileSentrix Silver image also is not a
sufficient storefront source. Use the exact real PhoneLCDParts OEM-pull photos
at `output/model-media-review-2026-08-14/supplier-galleries/iphone-17-pro-max-silver/`
after the model-separated media review.
