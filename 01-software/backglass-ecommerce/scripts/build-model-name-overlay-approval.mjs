import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const reviewRoot = path.resolve("output/model-media-review-2026-08-14");
const inputRoot = path.join(
  reviewRoot,
  "color-grade-replacements-awaiting-approval",
);
const inputManifestPath = path.join(inputRoot, "replacement-manifest.json");
const outputRoot = path.resolve(
  "/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-16-and-17-model-specific-half-assembly-no-coil/2026-08-14/model-name-overlay-awaiting-approval",
);
const imageRoot = path.join(outputRoot, "images");
const sourceCompositeRoot = path.join(outputRoot, "source-composites");
const contactSheetRoot = path.join(outputRoot, "contact-sheets");
const qaRoot = path.join(outputRoot, "design-qa");
const iphone17SupplierRoot = path.join(
  outputRoot,
  "source-originals",
  "iphone-17-zeespares",
);

const referencePage =
  "https://backglasspros.com/products/iphone-17-back-glass-full-assembly-with-coil-a-grade";
const placementReferencePage =
  "https://backglasspros.com/products/iphone-16-pro-max-half-assembly-no-coil-premium";
const placementReferenceScore = 90;
const placementReferenceImage = path.join(
  qaRoot,
  "reference-90-iphone-16-pro-max-black.png",
);

const typography = {
  centerX: 530,
  mainTop: 900,
  mainWidth: 850,
  mainMaxHeight: 700,
  qualifierTop: 1590,
  qualifierWidth: 850,
  qualifierMaxHeight: 240,
};

const layoutByModel = {
  "iPhone 16": {
    placementRule: "shared measured exterior safe box; main line only",
    lines: [{ text: "16", role: "main" }],
  },
  "iPhone 16 Plus": {
    placementRule: "shared measured exterior safe boxes; main plus qualifier",
    lines: [
      { text: "16", role: "main" },
      { text: "PLUS", role: "qualifier" },
    ],
  },
  "iPhone 16 Pro": {
    placementRule: "shared measured exterior safe boxes; main plus qualifier",
    lines: [
      { text: "16", role: "main" },
      { text: "PRO", role: "qualifier" },
    ],
  },
  "iPhone 16 Pro Max": {
    placementRule: "shared measured exterior safe boxes; main plus qualifier",
    lines: [
      { text: "16", role: "main" },
      { text: "PRO MAX", role: "qualifier" },
    ],
  },
  "iPhone 17": {
    placementRule:
      "shared measured exterior safe box on a non-overlapping exact-model source composition",
    lines: [{ text: "17", role: "main" }],
  },
  "iPhone 17 Pro": {
    placementRule: "shared measured exterior safe boxes; main plus qualifier",
    lines: [
      { text: "17", role: "main" },
      { text: "PRO", role: "qualifier" },
    ],
  },
  "iPhone 17 Pro Max": {
    placementRule: "shared measured exterior safe boxes; main plus qualifier",
    lines: [
      { text: "17", role: "main" },
      { text: "PRO MAX", role: "qualifier" },
    ],
  },
};

const iphone17SourceByColor = {
  Black: {
    asset: "iphone-17-black.jpg",
    sourceColor: "Black",
    page: "https://zeespares.in/products/back-panel-with-camera-glass-for-apple-iphone-17-black",
    image:
      "https://zeespares.in/cdn/shop/files/back-panel-with-camera-glass-for-apple-iphone-17-black.jpg?v=1777384907",
  },
  White: {
    asset: "iphone-17-white.jpg",
    sourceColor: "White",
    page: "https://zeespares.in/products/back-panel-with-camera-glass-for-apple-iphone-17-white",
    image:
      "https://zeespares.in/cdn/shop/files/back-panel-with-camera-glass-for-apple-iphone-17-white.jpg?v=1777384910",
  },
  "Mist Blue": {
    asset: "iphone-17-blue.jpg",
    sourceColor: "Blue (Apple Mist Blue match)",
    page: "https://zeespares.in/products/back-panel-with-camera-glass-for-apple-iphone-17-blue",
    image:
      "https://zeespares.in/cdn/shop/files/back-panel-with-camera-glass-for-apple-iphone-17-blue.jpg?v=1777384915",
  },
  Sage: {
    asset: "iphone-17-green.jpg",
    sourceColor: "Green (Apple Sage match)",
    page: "https://zeespares.in/products/back-panel-with-camera-glass-for-apple-iphone-17-green",
    image:
      "https://zeespares.in/cdn/shop/files/back-panel-with-camera-glass-for-apple-iphone-17-green.jpg?v=1777384920",
  },
  Lavender: {
    asset: "iphone-17-lavender.jpg",
    sourceColor: "Lavender",
    page: "https://zeespares.in/products/back-panel-with-camera-glass-for-apple-iphone-17-lavender",
    image:
      "https://zeespares.in/cdn/shop/files/back-panel-with-camera-glass-for-apple-iphone-17-lavender.jpg?v=1777384924",
  },
};

const sha256 = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex");

function xml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function modelSlug(model) {
  return model.toLowerCase().replaceAll(" ", "-");
}

async function renderMeasuredText(text, role) {
  const isMain = role === "main";
  const targetWidth = isMain
    ? typography.mainWidth
    : typography.qualifierWidth;
  const maxHeight = isMain
    ? typography.mainMaxHeight
    : typography.qualifierMaxHeight;
  const top = isMain ? typography.mainTop : typography.qualifierTop;
  const sourceSvg = Buffer.from(`
    <svg width="8000" height="1700" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="model-label" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#c7b8ff"/>
          <stop offset="48%" stop-color="#91e6ee"/>
          <stop offset="100%" stop-color="#c0b1ff"/>
        </linearGradient>
      </defs>
      <text x="120" y="1260" font-size="1000" letter-spacing="-20"
        font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
        font-weight="700" fill="url(#model-label)" fill-opacity="0.82">${xml(text)}</text>
    </svg>`);
  const trimmed = await sharp(sourceSvg)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const resized = await sharp(trimmed)
    .resize({ width: targetWidth, height: maxHeight, fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });
  return {
    input: resized.data,
    left: Math.round(typography.centerX - resized.info.width / 2),
    top,
    visibleGlyphBox: {
      left: Math.round(typography.centerX - resized.info.width / 2),
      top,
      width: resized.info.width,
      height: resized.info.height,
    },
  };
}

async function normalizeComposition(inputBytes) {
  const trimmed = await sharp(inputBytes)
    .trim({ background: "#ffffff", threshold: 10 })
    .png()
    .toBuffer();
  return sharp(trimmed)
    .resize({
      width: 1840,
      height: 2200,
      fit: "contain",
      background: "#ffffff",
    })
    .extend({
      top: 150,
      bottom: 150,
      left: 80,
      right: 80,
      background: "#ffffff",
    })
    .jpeg({ chromaSubsampling: "4:4:4", quality: 95 })
    .toBuffer();
}

async function supplierHalf(sourceBytes, side) {
  const metadata = await sharp(sourceBytes).metadata();
  const divider = Math.floor(metadata.width / 2);
  const extraction =
    side === "exterior"
      ? { left: 0, top: 0, width: divider, height: metadata.height }
      : {
          left: divider,
          top: 0,
          width: metadata.width - divider,
          height: metadata.height,
        };
  const half = await sharp(sourceBytes)
    .extract(extraction)
    .png()
    .toBuffer();
  return sharp(half)
    .trim({ background: "#ffffff", threshold: 20 })
    .resize({ height: 1800 })
    .png()
    .toBuffer({ resolveWithObject: true });
}

async function buildIphone17Composition(record) {
  const source = iphone17SourceByColor[record.color];
  if (!source) throw new Error(`No verified iPhone 17 source for ${record.color}`);
  const exteriorPath = path.join(iphone17SupplierRoot, source.asset);
  const canonicalInteriorPath = path.join(
    iphone17SupplierRoot,
    iphone17SourceByColor.Black.asset,
  );
  const [exteriorSourceBytes, canonicalInteriorSourceBytes] = await Promise.all([
    readFile(exteriorPath),
    readFile(canonicalInteriorPath),
  ]);
  const [exterior, interior] = await Promise.all([
    supplierHalf(exteriorSourceBytes, "exterior"),
    supplierHalf(canonicalInteriorSourceBytes, "interior"),
  ]);
  const composition = await sharp({
    create: { width: 2000, height: 2500, channels: 3, background: "white" },
  })
    .composite([
      {
        input: exterior.data,
        left: Math.round(520 - exterior.info.width / 2),
        top: 350,
      },
      {
        input: interior.data,
        left: Math.round(1500 - interior.info.width / 2),
        top: 350,
      },
    ])
    .jpeg({ chromaSubsampling: "4:4:4", quality: 95 })
    .toBuffer();
  return {
    bytes: composition,
    rawExteriorPath: exteriorPath,
    rawExteriorSha256: sha256(exteriorSourceBytes),
    rawInteriorPath: canonicalInteriorPath,
    rawInteriorSha256: sha256(canonicalInteriorSourceBytes),
    source,
  };
}

function labelSvg(title, subtitle, width) {
  return Buffer.from(`
    <svg width="${width}" height="92" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="24" y="39" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="700" fill="#111827">${xml(title)}</text>
      <text x="24" y="69" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="#166534">${xml(subtitle)}</text>
    </svg>`);
}

async function labeledTile(imagePath, title, subtitle, width, imageHeight) {
  const preview = await sharp(imagePath)
    .resize(width, imageHeight, { fit: "contain", background: "white" })
    .toBuffer();
  return sharp({
    create: {
      width,
      height: imageHeight + 92,
      channels: 3,
      background: "white",
    },
  })
    .composite([
      { input: labelSvg(title, subtitle, width), left: 0, top: 0 },
      { input: preview, left: 0, top: 92 },
    ])
    .jpeg({ chromaSubsampling: "4:4:4", quality: 94 })
    .toBuffer();
}

await Promise.all([
  mkdir(imageRoot, { recursive: true }),
  mkdir(sourceCompositeRoot, { recursive: true }),
  mkdir(contactSheetRoot, { recursive: true }),
  mkdir(qaRoot, { recursive: true }),
]);

const inputManifest = JSON.parse(await readFile(inputManifestPath, "utf8"));
const records = [];

for (const record of inputManifest.records) {
  const originalInputPath = path.join(inputRoot, record.output);
  const originalInputBytes = await readFile(originalInputPath);
  const slug = modelSlug(record.model);
  const outputFilename = path.basename(record.output).replace(
    /-review\.jpg$/,
    "-model-name-overlay-review.jpg",
  );
  const sourceCompositeFilename = path.basename(record.output).replace(
    /-review\.jpg$/,
    "-normalized-source-composite.jpg",
  );
  const modelOutputRoot = path.join(imageRoot, slug);
  const modelSourceRoot = path.join(sourceCompositeRoot, slug);
  await Promise.all([
    mkdir(modelOutputRoot, { recursive: true }),
    mkdir(modelSourceRoot, { recursive: true }),
  ]);

  let sourceCompositeBytes;
  let supplierEvidence = null;
  if (record.model === "iPhone 17") {
    const supplierComposition = await buildIphone17Composition(record);
    sourceCompositeBytes = supplierComposition.bytes;
    supplierEvidence = {
      page: supplierComposition.source.page,
      image: supplierComposition.source.image,
      sourceColor: supplierComposition.source.sourceColor,
      rawExteriorAsset: path.relative(
        outputRoot,
        supplierComposition.rawExteriorPath,
      ),
      rawExteriorSha256: supplierComposition.rawExteriorSha256,
      canonicalExactModelInteriorAsset: path.relative(
        outputRoot,
        supplierComposition.rawInteriorPath,
      ),
      canonicalExactModelInteriorSha256:
        supplierComposition.rawInteriorSha256,
      evidence:
        "Seller page identifies Apple iPhone 17 and the real photo visibly shows the exact-model exterior plus exposed magnets and metallic heat film with no wireless coil/flex.",
    };
  } else {
    sourceCompositeBytes = await normalizeComposition(originalInputBytes);
  }

  const sourceCompositePath = path.join(
    modelSourceRoot,
    sourceCompositeFilename,
  );
  await writeFile(sourceCompositePath, sourceCompositeBytes);

  const overlayLayers = [];
  const visibleGlyphBoxes = [];
  for (const line of layoutByModel[record.model].lines) {
    const layer = await renderMeasuredText(line.text, line.role);
    overlayLayers.push({ input: layer.input, left: layer.left, top: layer.top });
    visibleGlyphBoxes.push({
      text: line.text,
      role: line.role,
      ...layer.visibleGlyphBox,
    });
  }

  const outputPath = path.join(modelOutputRoot, outputFilename);
  const outputBytes = await sharp(sourceCompositeBytes)
    .composite(overlayLayers)
    .jpeg({ chromaSubsampling: "4:4:4", quality: 95 })
    .toBuffer();
  await writeFile(outputPath, outputBytes);

  records.push({
    model: record.model,
    color: record.color,
    gradesUsingSameExactModelAndColorPhoto:
      record.gradesUsingSameExactModelAndColorPhoto,
    originalBaselineReviewImage: path.relative(outputRoot, originalInputPath),
    originalBaselineReviewImageSha256: sha256(originalInputBytes),
    sourceComposite: path.relative(outputRoot, sourceCompositePath),
    sourceCompositeSha256: sha256(sourceCompositeBytes),
    supplierEvidence,
    output: path.relative(outputRoot, outputPath),
    outputSha256: sha256(outputBytes),
    overlayText: layoutByModel[record.model].lines
      .map(({ text }) => text)
      .join(" "),
    overlayPlacementRule: layoutByModel[record.model].placementRule,
    overlayVisibleGlyphBoxes: visibleGlyphBoxes,
    overlayFontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
    overlayFontWeight: 700,
    overlayFill: "cyan-to-lavender diagonal gradient",
    overlayOpacity: 0.82,
    transformations:
      record.model === "iPhone 17"
        ? [
            "real-photo crop",
            "exact-model inward-face reuse across same-model colors",
            "deterministic scale and white-canvas composition",
            "measured vector text overlay",
            "JPEG export",
          ]
        : [
            "white-canvas trim and proportional scale normalization",
            "measured vector text overlay",
            "JPEG export",
          ],
    aiGenerated: false,
    recolored: false,
    productPhotographyRetouched: false,
    productPhotographyRecomposed: record.model === "iPhone 17",
    shopifyUploaded: false,
  });
}

const modelNames = Object.keys(layoutByModel);
for (const model of modelNames) {
  const modelRecords = records.filter(({ model: value }) => value === model);
  const tileWidth = 380;
  const tileHeight = 580;
  const width = modelRecords.length * tileWidth;
  const composites = [];
  for (const [index, record] of modelRecords.entries()) {
    const preview = await sharp(path.join(outputRoot, record.output))
      .resize(340, 450, { fit: "contain", background: "white" })
      .toBuffer();
    composites.push({ input: preview, left: index * tileWidth + 20, top: 90 });
    composites.push({
      input: labelSvg(record.color, "A GRADE + PREMIUM", tileWidth),
      left: index * tileWidth,
      top: 0,
    });
  }
  await sharp({
    create: { width, height: tileHeight, channels: 3, background: "white" },
  })
    .composite(composites)
    .jpeg({ chromaSubsampling: "4:4:4", quality: 94 })
    .toFile(
      path.join(
        contactSheetRoot,
        `${modelSlug(model)}-model-name-overlay-contact-sheet.jpg`,
      ),
    );
}

const representativeTiles = [];
const overviewTileWidth = 500;
const overviewTileHeight = 700;
for (const [index, model] of modelNames.entries()) {
  const record = records.find(({ model: value }) => value === model);
  const preview = await sharp(path.join(outputRoot, record.output))
    .resize(450, 560, { fit: "contain", background: "white" })
    .toBuffer();
  const left = (index % 4) * overviewTileWidth;
  const top = Math.floor(index / 4) * overviewTileHeight;
  representativeTiles.push({ input: preview, left: left + 25, top: top + 100 });
  representativeTiles.push({
    input: labelSvg(model, "MEASURED LABEL SYSTEM", overviewTileWidth),
    left,
    top,
  });
}

const overviewPath = path.join(outputRoot, "model-name-overlay-overview.jpg");
await sharp({
  create: {
    width: 4 * overviewTileWidth,
    height: 2 * overviewTileHeight,
    channels: 3,
    background: "white",
  },
})
  .composite(representativeTiles)
  .jpeg({ chromaSubsampling: "4:4:4", quality: 94 })
  .toFile(overviewPath);

const before16ProMax = path.join(
  qaRoot,
  "before-v3",
  "iphone-16-pro-max-black.jpg",
);
const before17 = path.join(qaRoot, "before-v3", "iphone-17-lavender.jpg");
const after16ProMax = path.join(
  outputRoot,
  records.find(
    ({ model, color }) =>
      model === "iPhone 16 Pro Max" && color === "Black Titanium",
  ).output,
);
const after17 = path.join(
  outputRoot,
  records.find(
    ({ model, color }) => model === "iPhone 17" && color === "Lavender",
  ).output,
);
const focusedTiles = await Promise.all([
  labeledTile(
    placementReferenceImage,
    "90/100 REFERENCE",
    "iPHONE 16 PRO MAX · SOURCE TRUTH",
    600,
    750,
  ),
  labeledTile(before16ProMax, "BEFORE · 50/100 SET", "16 PRO MAX · V3", 600, 750),
  labeledTile(after16ProMax, "AFTER · MEASURED", "16 PRO MAX · V4", 600, 750),
  labeledTile(
    placementReferenceImage,
    "90/100 STYLE REFERENCE",
    "LABEL SCALE + ALIGNMENT",
    600,
    750,
  ),
  labeledTile(before17, "BEFORE · P1", "17 · COVERED SLIVER", 600, 750),
  labeledTile(after17, "AFTER · MEASURED", "17 · REAL PHOTO / NO COIL", 600, 750),
]);
await sharp({
  create: { width: 1800, height: 1684, channels: 3, background: "white" },
})
  .composite(
    focusedTiles.map((input, index) => ({
      input,
      left: (index % 3) * 600,
      top: Math.floor(index / 3) * 842,
    })),
  )
  .jpeg({ chromaSubsampling: "4:4:4", quality: 94 })
  .toFile(path.join(qaRoot, "reference-before-after-focused-comparison.jpg"));

const [referenceFullTile, overviewTile] = await Promise.all([
  labeledTile(
    placementReferenceImage,
    "90/100 REFERENCE",
    "SOURCE TRUTH · 2000 x 2500",
    650,
    980,
  ),
  labeledTile(
    overviewPath,
    "V4 FULL SET",
    "7 MODELS · SHARED GLYPH BOXES",
    1550,
    980,
  ),
]);
await sharp({
  create: { width: 2200, height: 1072, channels: 3, background: "white" },
})
  .composite([
    { input: referenceFullTile, left: 0, top: 0 },
    { input: overviewTile, left: 650, top: 0 },
  ])
  .jpeg({ chromaSubsampling: "4:4:4", quality: 94 })
  .toFile(path.join(qaRoot, "reference-versus-full-set-comparison.jpg"));

const manifest = {
  createdAt: new Date().toISOString(),
  status: "awaiting-owner-approval",
  purpose:
    "Local model-name overlay review using exact-model real product photography and a measured shared label system",
  referencePage,
  placementReference: {
    page: placementReferencePage,
    image: path.relative(outputRoot, placementReferenceImage),
    ownerScore: placementReferenceScore,
    role: "minimum acceptable model-label placement baseline",
  },
  style: {
    modelNaming: [
      "16",
      "16 PLUS",
      "16 PRO",
      "16 PRO MAX",
      "17",
      "17 PRO",
      "17 PRO MAX",
    ],
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
    fontWeight: 700,
    fill: "translucent diagonal cyan-to-lavender gradient",
    placementRevision: "measured-safe-box-v4",
    typography,
    placement:
      "Every visible glyph layer is trimmed, proportionally fit to the same exterior-panel safe boxes, and centered at the same x coordinate. Main lines share one top and size cap; qualifiers share one top, width, and height cap. Source compositions are proportionally normalized to the same 2000 x 2500 canvas.",
    inwardFaceObscured: false,
  },
  rules: {
    originalBaselinePreserved: true,
    overlayLimitedToModelName: true,
    aiGenerated: false,
    recolored: false,
    productPhotographyRetouched: false,
    iphone17UsesVerifiedRealSupplierPhotos: true,
    iphone17CanonicalInwardFaceReusedOnlyWithinExactModel: true,
    shopifyUploadApproved: false,
  },
  counts: {
    models: modelNames.length,
    colors: records.length,
    gradeTargets: records.reduce(
      (sum, record) =>
        sum + record.gradesUsingSameExactModelAndColorPhoto.length,
      0,
    ),
    uniqueOutputs: new Set(records.map(({ outputSha256 }) => outputSha256)).size,
  },
  qa: {
    ownerRejectedPriorScore: 50,
    targetBaselineScore: 90,
    focusedComparison: "design-qa/reference-before-after-focused-comparison.jpg",
    fullSetComparison: "design-qa/reference-versus-full-set-comparison.jpg",
  },
  records,
  withheld: inputManifest.withheld,
  shopifyMutated: false,
};

await writeFile(
  path.join(outputRoot, "overlay-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      outputRoot,
      counts: manifest.counts,
      overview: overviewPath,
      focusedComparison: path.join(
        qaRoot,
        "reference-before-after-focused-comparison.jpg",
      ),
      fullSetComparison: path.join(
        qaRoot,
        "reference-versus-full-set-comparison.jpg",
      ),
      shopifyMutated: false,
    },
    null,
    2,
  ),
);
