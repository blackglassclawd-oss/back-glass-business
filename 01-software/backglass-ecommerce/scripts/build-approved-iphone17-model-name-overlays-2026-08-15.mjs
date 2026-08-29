import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const sourceRoot = path.resolve(
  "/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-17-separate-search/2026-08-14/awaiting-approval",
);
const sourceManifestPath = path.join(
  sourceRoot,
  "iphone-17-source-evidence-manifest.json",
);
const outputRoot = path.resolve(
  "/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-17-separate-search/2026-08-15/approved-model-name-overlay",
);
const imageRoot = path.join(outputRoot, "images");
const qaRoot = path.join(outputRoot, "design-qa");
const referenceImage = path.resolve(
  "/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-16-and-17-model-specific-half-assembly-no-coil/2026-08-14/model-name-overlay-awaiting-approval/design-qa/reference-90-iphone-16-pro-max-black.png",
);

const typography = {
  centerX: 530,
  mainTop: 900,
  mainWidth: 850,
  mainMaxHeight: 700,
};

const colorSlug = {
  Black: "black",
  White: "white",
  "Mist Blue": "mist-blue",
  Sage: "sage",
  Lavender: "lavender",
};

const sha256 = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex");

function xml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function renderMeasuredText(text) {
  const svg = Buffer.from(`
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
  const trimmed = await sharp(svg)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const resized = await sharp(trimmed)
    .resize({
      width: typography.mainWidth,
      height: typography.mainMaxHeight,
      fit: "inside",
    })
    .png()
    .toBuffer({ resolveWithObject: true });
  return {
    bytes: resized.data,
    box: {
      left: Math.round(typography.centerX - resized.info.width / 2),
      top: typography.mainTop,
      width: resized.info.width,
      height: resized.info.height,
    },
  };
}

function tileLabel(title, subtitle, width) {
  return Buffer.from(`
    <svg width="${width}" height="92" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="22" y="38" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#111827">${xml(title)}</text>
      <text x="22" y="68" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="#166534">${xml(subtitle)}</text>
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
      { input: tileLabel(title, subtitle, width), left: 0, top: 0 },
      { input: preview, left: 0, top: 92 },
    ])
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

await Promise.all([
  mkdir(imageRoot, { recursive: true }),
  mkdir(qaRoot, { recursive: true }),
]);

const sourceManifest = JSON.parse(await readFile(sourceManifestPath, "utf8"));
if (sourceManifest.model !== "iPhone 17") {
  throw new Error(`Expected iPhone 17 source manifest, found ${sourceManifest.model}.`);
}
if (sourceManifest.evidenceRecords.length !== 5) {
  throw new Error(
    `Expected five approved color records, found ${sourceManifest.evidenceRecords.length}.`,
  );
}

const overlay = await renderMeasuredText("17");
const records = [];

for (const source of sourceManifest.evidenceRecords) {
  const slug = colorSlug[source.color];
  if (!slug) throw new Error(`Unexpected iPhone 17 color: ${source.color}`);
  const sourcePath = path.join(sourceRoot, source.sourceAsset);
  const sourceBytes = await readFile(sourcePath);
  if (sha256(sourceBytes) !== source.sourceSha256) {
    throw new Error(`Source hash mismatch for ${source.color}: ${sourcePath}`);
  }
  const metadata = await sharp(sourceBytes).metadata();
  if (metadata.width !== source.width || metadata.height !== source.height) {
    throw new Error(
      `Source dimensions changed for ${source.color}: ${metadata.width}x${metadata.height}.`,
    );
  }

  const normalized = await sharp(sourceBytes)
    .resize({
      width: 2000,
      height: 2500,
      fit: "contain",
      background: "white",
    })
    .jpeg({ quality: 95, chromaSubsampling: "4:4:4" })
    .toBuffer();
  const outputBytes = await sharp(normalized)
    .composite([
      { input: overlay.bytes, left: overlay.box.left, top: overlay.box.top },
    ])
    .jpeg({ quality: 95, chromaSubsampling: "4:4:4" })
    .toBuffer();
  const outputPath = path.join(
    imageRoot,
    `iphone-17-${slug}-model-name-overlay-approved.jpg`,
  );
  await writeFile(outputPath, outputBytes);
  records.push({
    model: "iPhone 17",
    color: source.color,
    sourcePageUrl: source.sourcePageUrl,
    sourceImageUrl: source.sourceImageUrl,
    sourceAsset: path.relative(outputRoot, sourcePath),
    sourceSha256: source.sourceSha256,
    output: path.relative(outputRoot, outputPath),
    outputSha256: sha256(outputBytes),
    width: 2000,
    height: 2500,
    overlayText: "17",
    overlayVisibleGlyphBox: overlay.box,
    transformations: [
      "proportional fit to a 2000 x 2500 white canvas",
      "measured vector model-name text overlay",
      "JPEG export",
    ],
    exactModelRealPhoto: true,
    aiGenerated: false,
    recolored: false,
    inwardFaceReusedAcrossModels: false,
    shopifyUploaded: false,
  });
}

const contactTileWidth = 440;
const contactTileHeight = 610;
const contactTiles = await Promise.all(
  records.map((record) =>
    labeledTile(
      path.join(outputRoot, record.output),
      `iPHONE 17 · ${record.color.toUpperCase()}`,
      "APPROVED REAL PHOTO · MODEL LABEL",
      contactTileWidth,
      contactTileHeight,
    ),
  ),
);
const contactSheetPath = path.join(
  outputRoot,
  "iphone-17-approved-model-name-overlay-contact-sheet.jpg",
);
await sharp({
  create: {
    width: contactTileWidth * contactTiles.length,
    height: contactTileHeight + 92,
    channels: 3,
    background: "white",
  },
})
  .composite(
    contactTiles.map((input, index) => ({
      input,
      left: index * contactTileWidth,
      top: 0,
    })),
  )
  .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
  .toFile(contactSheetPath);

const [referenceTile, implementationTile] = await Promise.all([
  labeledTile(
    referenceImage,
    "90/100 OWNER REFERENCE",
    "LABEL SCALE · ALIGNMENT · EXTERIOR ONLY",
    800,
    1000,
  ),
  labeledTile(
    path.join(outputRoot, records[0].output),
    "iPHONE 17 IMPLEMENTATION",
    "SAME MEASURED SAFE BOX · REAL MAGNET-ONLY PHOTO",
    800,
    1000,
  ),
]);
const comparisonPath = path.join(
  qaRoot,
  "reference-90-versus-approved-iphone-17-overlay.jpg",
);
await sharp({
  create: { width: 1600, height: 1092, channels: 3, background: "white" },
})
  .composite([
    { input: referenceTile, left: 0, top: 0 },
    { input: implementationTile, left: 800, top: 0 },
  ])
  .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
  .toFile(comparisonPath);

const manifest = {
  createdAt: new Date().toISOString(),
  status: "owner-approved-ready-for-shopify",
  ownerApprovalDate: "2026-08-15",
  model: "iPhone 17",
  purpose: "Owner-approved iPhone 17 exact-model images with the established model-name typography",
  sourceManifest: sourceManifestPath,
  placementReference: {
    page: sourceManifest.sourceTruth.ownerPlacementReference,
    ownerScore: sourceManifest.sourceTruth.ownerPlacementReferenceScore,
    localImage: referenceImage,
  },
  style: {
    text: "17",
    fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
    fontWeight: 700,
    fill: "translucent diagonal cyan-to-lavender gradient",
    opacity: 0.82,
    typography,
    visibleGlyphBox: overlay.box,
  },
  rules: {
    ownerApprovedBaseline: true,
    exactModelOnly: true,
    sameInwardFaceMayBeReusedOnlyAcrossIphone17Colors: true,
    crossModelReuse: false,
    aiGenerated: false,
    recolored: false,
    productPhotographyRetouched: false,
    modelTextApplied: true,
    shopifyUploaded: false,
  },
  counts: {
    colors: records.length,
    uniqueSourceHashes: new Set(records.map(({ sourceSha256 }) => sourceSha256)).size,
    uniqueOutputHashes: new Set(records.map(({ outputSha256 }) => outputSha256)).size,
  },
  records,
  reviewArtifacts: {
    contactSheet: path.relative(outputRoot, contactSheetPath),
    referenceComparison: path.relative(outputRoot, comparisonPath),
  },
};
await writeFile(
  path.join(outputRoot, "approved-iphone17-overlay-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      contactSheetPath,
      comparisonPath,
      outputRoot,
      records: records.length,
      textBox: overlay.box,
    },
    null,
    2,
  ),
);
