import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const outputRoot = path.resolve(
  "/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-17-separate-search/2026-08-14/awaiting-approval",
);
const sourceRoot = path.join(outputRoot, "source-originals");
const contactSheetRoot = path.join(outputRoot, "contact-sheets");
const qaRoot = path.join(outputRoot, "design-qa");
const referencePath = path.resolve(
  "/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-16-and-17-model-specific-half-assembly-no-coil/2026-08-14/model-name-overlay-awaiting-approval/design-qa/reference-90-iphone-16-pro-max-black.png",
);

const candidates = [
  {
    color: "Black",
    filename: "phonelcdparts-magnet-only/17-bhbc-blk-1.jpg",
    detailFilename: "phonelcdparts-magnet-only/17-bhbc-blk-2.jpg",
    image: "https://www.phonelcdparts.com/media/catalog/product/cache/5014dac2a594f1a753169c828e8e63b8/1/7/17-bhbc-blk-1.jpg",
    detailImage: "https://www.phonelcdparts.com/media/catalog/product/cache/5014dac2a594f1a753169c828e8e63b8/1/7/17-bhbc-blk-2.jpg",
    page: "https://www.phonelcdparts.com/apple/iphone-parts/iphone-17/back-glass-with-frame-and-magsafe-magnet-for-iphone-17-no-logo-black-17-bhbc-blk",
  },
  {
    color: "White",
    filename: "phonelcdparts-magnet-only/17-bhbc-wht-1.jpg",
    detailFilename: "phonelcdparts-magnet-only/17-bhbc-wht-2.jpg",
    image: "https://www.phonelcdparts.com/media/catalog/product/cache/5014dac2a594f1a753169c828e8e63b8/1/7/17-bhbc-wht-1.jpg",
    detailImage: "https://www.phonelcdparts.com/media/catalog/product/cache/5014dac2a594f1a753169c828e8e63b8/1/7/17-bhbc-wht-2.jpg",
    page: "https://www.phonelcdparts.com/back-glass-with-frame-and-magsafe-magnet-for-iphone-17-no-logo-white-17-bhbc-wht",
  },
  {
    color: "Mist Blue",
    filename: "phonelcdparts-magnet-only/17-bhbc-mblu-1.jpg",
    detailFilename: "phonelcdparts-magnet-only/17-bhbc-mblu-2.jpg",
    image: "https://www.phonelcdparts.com/media/catalog/product/cache/5014dac2a594f1a753169c828e8e63b8/1/7/17-bhbc-mblu-1.jpg",
    detailImage: "https://www.phonelcdparts.com/media/catalog/product/cache/5014dac2a594f1a753169c828e8e63b8/1/7/17-bhbc-mblu-2.jpg",
    page: "https://www.phonelcdparts.com/back-glass-with-frame-and-magsafe-magnet-for-iphone-17-no-logo-mist-blue-17-bhbc-mblu",
  },
  {
    color: "Sage",
    filename: "phonelcdparts-magnet-only/17-bhbc-grn-1.jpg",
    detailFilename: "phonelcdparts-magnet-only/17-bhbc-grn-2.jpg",
    image: "https://www.phonelcdparts.com/media/catalog/product/cache/5014dac2a594f1a753169c828e8e63b8/1/7/17-bhbc-grn-1.jpg",
    detailImage: "https://www.phonelcdparts.com/media/catalog/product/cache/5014dac2a594f1a753169c828e8e63b8/1/7/17-bhbc-grn-2.jpg",
    page: "https://www.phonelcdparts.com/back-glass-with-frame-and-magsafe-magnet-for-iphone-17-no-logo-sage-17-bhbc-grn",
  },
  {
    color: "Lavender",
    filename: "phonelcdparts-magnet-only/17-bhbc-lvd-1.jpg",
    detailFilename: "phonelcdparts-magnet-only/17-bhbc-lvd-2.jpg",
    image: "https://www.phonelcdparts.com/media/catalog/product/cache/5014dac2a594f1a753169c828e8e63b8/1/7/17-bhbc-lvd-1.jpg",
    detailImage: "https://www.phonelcdparts.com/media/catalog/product/cache/5014dac2a594f1a753169c828e8e63b8/1/7/17-bhbc-lvd-2.jpg",
    page: "https://www.phonelcdparts.com/back-glass-with-frame-and-magsafe-magnet-for-iphone-17-no-logo-lavender-17-bhbc-lvd",
  },
];

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function xml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function labelSvg(title, subtitle, width, statusColor = "#166534") {
  return Buffer.from(`
    <svg width="${width}" height="110" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="24" y="44" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#111827">${xml(title)}</text>
      <text x="24" y="79" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" fill="${statusColor}">${xml(subtitle)}</text>
    </svg>`);
}

async function labeledTile(imagePath, title, subtitle, width, imageHeight) {
  const preview = await sharp(imagePath)
    .resize(width - 24, imageHeight - 24, { fit: "contain", background: "white" })
    .toBuffer();
  return sharp({
    create: {
      width,
      height: imageHeight + 110,
      channels: 3,
      background: "white",
    },
  })
    .composite([
      { input: labelSvg(title, subtitle, width), left: 0, top: 0 },
      { input: preview, left: 12, top: 122 },
    ])
    .jpeg({ chromaSubsampling: "4:4:4", quality: 94 })
    .toBuffer();
}

await Promise.all([
  mkdir(contactSheetRoot, { recursive: true }),
  mkdir(qaRoot, { recursive: true }),
]);

const evidenceRecords = [];
const tiles = [];
const detailTiles = [];
for (const candidate of candidates) {
  const sourcePath = path.join(sourceRoot, candidate.filename);
  const detailPath = path.join(sourceRoot, candidate.detailFilename);
  const [bytes, detailBytes] = await Promise.all([
    readFile(sourcePath),
    readFile(detailPath),
  ]);
  const [metadata, detailMetadata] = await Promise.all([
    sharp(bytes).metadata(),
    sharp(detailBytes).metadata(),
  ]);
  if (
    metadata.width !== 2068 ||
    metadata.height !== 2604 ||
    detailMetadata.width !== 2068 ||
    detailMetadata.height !== 2604
  ) {
    throw new Error(
      `${candidate.filename} or ${candidate.detailFilename} is not the expected 2068x2604 supplier original.`,
    );
  }
  evidenceRecords.push({
    color: candidate.color,
    sourceAsset: path.relative(outputRoot, sourcePath),
    inwardFaceDetailAsset: path.relative(outputRoot, detailPath),
    sourceImageUrl: candidate.image,
    inwardFaceDetailImageUrl: candidate.detailImage,
    sourcePageUrl: candidate.page,
    sourceSha256: sha256(bytes),
    inwardFaceDetailSha256: sha256(detailBytes),
    width: metadata.width,
    height: metadata.height,
    visualChecks: {
      exactModelListing: true,
      correctVerticalDualCameraExterior: true,
      exteriorFullyVisible: true,
      inwardFaceFullyVisible: true,
      exposedSegmentedMagnets: true,
      metallicHeatDissipatingFilmInsideMagnetCircle: true,
      wirelessChargingCoilOrFlexVisiblyInstalled: false,
      consistentSupplierFramingAcrossColors: true,
    },
  });
  tiles.push(
    await labeledTile(
      sourcePath,
      `iPHONE 17 · ${candidate.color.toUpperCase()}`,
      "SOURCE PASS · MAGNETS + FILM · NO COIL/FLEX",
      500,
      650,
    ),
  );
  detailTiles.push(
    await labeledTile(
      detailPath,
      `iPHONE 17 · ${candidate.color.toUpperCase()}`,
      "INWARD-FACE DETAIL · MAGNET ONLY",
      500,
      650,
    ),
  );
}

const contactSheetPath = path.join(
  contactSheetRoot,
  "iphone-17-phonelcdparts-magnet-only-five-color-source-contact-sheet.jpg",
);
await sharp({
  create: { width: 2500, height: 760, channels: 3, background: "white" },
})
  .composite(
    tiles.map((input, index) => ({ input, left: index * 500, top: 0 })),
  )
  .jpeg({ chromaSubsampling: "4:4:4", quality: 94 })
  .toFile(contactSheetPath);

const detailContactSheetPath = path.join(
  contactSheetRoot,
  "iphone-17-phonelcdparts-magnet-only-inward-face-detail-contact-sheet.jpg",
);
await sharp({
  create: { width: 2500, height: 760, channels: 3, background: "white" },
})
  .composite(
    detailTiles.map((input, index) => ({ input, left: index * 500, top: 0 })),
  )
  .jpeg({ chromaSubsampling: "4:4:4", quality: 94 })
  .toFile(detailContactSheetPath);

const [referenceTile, candidateTile] = await Promise.all([
  labeledTile(
    referencePath,
    "90/100 STORE STYLE REFERENCE",
    "LABEL SCALE + ALIGNMENT BASELINE",
    700,
    920,
  ),
  labeledTile(
    path.join(sourceRoot, "phonelcdparts-magnet-only/17-bhbc-lvd-1.jpg"),
    "NEW iPHONE 17 SOURCE",
    "RAW PHOTO · OVERLAY HELD FOR OWNER APPROVAL",
    700,
    920,
  ),
]);
const comparisonPath = path.join(
  qaRoot,
  "reference-90-versus-iphone-17-source-comparison.jpg",
);
await sharp({
  create: { width: 1400, height: 1030, channels: 3, background: "white" },
})
  .composite([
    { input: referenceTile, left: 0, top: 0 },
    { input: candidateTile, left: 700, top: 0 },
  ])
  .jpeg({ chromaSubsampling: "4:4:4", quality: 94 })
  .toFile(comparisonPath);

const manifest = {
  createdAt: new Date().toISOString(),
  status: "awaiting-owner-approval",
  finalResult: "passed-source-screening-only",
  model: "iPhone 17",
  purpose:
    "Separate exact-model real-photo search replacing the rejected iPhone 17 source set",
  source: {
    supplier: "PhoneLCDParts",
    catalogPage: "https://www.phonelcdparts.com/apple/iphone-parts/iphone-17?p=3",
    listingTitle:
      "Back Glass with Frame and MagSafe Magnet for iPhone 17 (NO LOGO)",
    listedColors: ["Black", "White", "Mist Blue", "Sage", "Lavender"],
    configuration: "MagSafe magnet only; separate catalog products add wireless/NFC charging flex",
  },
  sourceTruth: {
    appleModelPage: "https://www.apple.com/ie/iphone-17/",
    appleRecyclerGuide:
      "https://www.apple.com/vn/recycling/recycler-guides/pdf/products/iphone/iPhone_17_Recycler_Guide_English.pdf",
    ownerPlacementReference:
      "https://backglasspros.com/products/iphone-16-pro-max-half-assembly-no-coil-premium",
    ownerPlacementReferenceScore: 90,
  },
  rules: {
    exactModelOnly: true,
    sameInwardFaceMayBeReusedOnlyAcrossIphone17Colors: true,
    crossModelReuse: false,
    syntheticEditsApplied: false,
    aiGeneratedByCodex: false,
    recoloredByCodex: false,
    modelTextApplied: false,
    shopifyUploaded: false,
  },
  rejectedAlternatives: [
    {
      source: "Bros Phone Parts broader assembly listing",
      page:
        "https://brosphoneparts.com/products/iphone-17-back-glass-with-steel-plate-with-wireless-nfc-charging-magsafe-magnet-flashlight-flex-no-logo-all-colors",
      reason:
        "Its five photographs visually match the selected geometry, but its broader product title mentions wireless/NFC/flashlight flex; the explicit PhoneLCDParts magnet-only listings provide stronger configuration evidence.",
    },
    {
      source: "eBay 297814142631",
      page: "https://www.ebay.com/itm/297814142631",
      localEvidenceAsset: "source-originals/ebay-297814142631-main.png",
      reason:
        "Multi-model listing and blue shipping film obscure exact inward-face detail; unsuitable for the approved photo format.",
    },
    {
      source: "MobileSentrix OEM pull",
      page:
        "https://www.mobilesentrix.com/back-glass-w-magsafe-magnet-nfc-flashlight-flex-for-iphone-17-used-oem-pull-grade-b-black",
      reason:
        "Product is explicitly sold with MagSafe, NFC, and flashlight flex installed, conflicting with the no-coil/flex photo requirement.",
    },
    {
      source: "PhoneLCDParts OEM pull",
      page:
        "https://www.phonelcdparts.com/apple/iphone-parts/iphone-17/back-glass-with-frame-and-wireless-nfc-charging-flex-and-magsafe-magnet-for-iphone-17-black-oem-pull-b-grade-pb-17-bcwc-blk",
      reason:
        "Product is explicitly sold with wireless/NFC charging flex installed, so the inward face does not match the requested configuration.",
    },
    {
      source: "DIYFixTool",
      page:
        "https://www.diyfixtool.com/products/for-iphone-17-air-17-pro-max-back-glass-with-magsafe-magnet-ring",
      reason:
        "Listing mixes multiple iPhone 17-series models and states that the exterior is printed with an Apple logo.",
    },
    {
      source: "ZeeSpares prior iPhone 17 set",
      page:
        "https://zeespares.in/products/back-panel-with-camera-glass-for-apple-iphone-17-black",
      reason:
        "Previous source set was rejected by the owner because its iPhone 17 composition did not follow the established formatting closely enough.",
    },
  ],
  evidenceRecords,
  reviewArtifacts: {
    contactSheet: path.relative(outputRoot, contactSheetPath),
    inwardFaceDetailContactSheet: path.relative(
      outputRoot,
      detailContactSheetPath,
    ),
    referenceComparison: path.relative(outputRoot, comparisonPath),
  },
};
await writeFile(
  path.join(outputRoot, "iphone-17-source-evidence-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

const qaReport = `# iPhone 17 separate source search design QA

## Source truth

- Store placement baseline: ${manifest.sourceTruth.ownerPlacementReference} (owner score: 90/100).
- Apple model evidence: ${manifest.sourceTruth.appleModelPage} confirms the base iPhone 17 vertical dual-camera exterior and five colors.
- Apple component evidence: ${manifest.sourceTruth.appleRecyclerGuide} identifies the iPhone 17 back glass as a distinct removable component.
- Supplier evidence: ${manifest.source.catalogPage} lists explicit magnet-only, no-logo base iPhone 17 products in Black, White, Mist Blue, Sage, and Lavender. Each color has a 2068 x 2604 full exterior/interior composition and a separate 2068 x 2604 inward-face detail photograph.

## Implementation truth

- The ten supplier originals are preserved byte-for-byte under \`source-originals/phonelcdparts-magnet-only/\` with SHA-256 hashes in \`iphone-17-source-evidence-manifest.json\`.
- Each photo shows the correct base-model dual-camera exterior beside a complete inward face.
- The inward face visibly exposes segmented magnets and metallic film inside the circle; no wireless coil or flex overlays the photographed interior.
- All five sources use the same scale, vertical alignment, camera framing, and white background.
- No AI generation, recoloring, synthetic reconstruction, or model-name overlay was applied.
- Nothing from this source set was uploaded to Shopify.
- Multi-model, coil/flex-installed, logo-bearing, and previously rejected candidates are recorded in the manifest and excluded from the selected set.

## Combined comparison

- \`design-qa/reference-90-versus-iphone-17-source-comparison.jpg\` places the 90/100 store reference and the new raw iPhone 17 source in one frame.
- \`contact-sheets/iphone-17-phonelcdparts-magnet-only-inward-face-detail-contact-sheet.jpg\` places all five exact-model inward-face closeups on one canvas for direct geometry comparison.
- The new source resolves the prior iPhone 17 inconsistency at the photography layer: exterior and interior are both full-height, non-overlapping, and consistently aligned.
- The model-name overlay remains intentionally pending owner approval; it must later use the same measured label box as the approved series rather than the rejected iPhone 17 placement.

## Final result

passed (source-screening stage only; Shopify remains blocked pending owner approval)
`;
await writeFile(path.join(outputRoot, "iphone-17-source-search-design-qa.md"), qaReport);

console.log(
  `BUILT\tcandidates=${candidates.length}\tcontactSheet=${contactSheetPath}\tdetailContactSheet=${detailContactSheetPath}\tcomparison=${comparisonPath}`,
);
