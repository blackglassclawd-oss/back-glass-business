import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const outputRoot = path.resolve(
  "output/model-media-review-2026-08-14/model-specific-interiors-awaiting-approval",
);
const sourceRoot = path.join(outputRoot, "source-originals");
const evidenceRoot = path.join(outputRoot, "interior-evidence");

const candidates = [
  {
    model: "iPhone 16",
    slug: "iphone-16",
    sourcePage:
      "https://repairpartsusa.com/products/iphone-16-back-glass-battery-cover-with-frame-magsafe-magnet-camera-lens-camera-bezel-metal-plate-black",
    sourceImage:
      "https://cdn.shopify.com/s/files/1/0628/3218/1433/files/iphone-16-back-cover-mag-safe-Black2.jpg?v=1758456852",
    sourcePixelSha256:
      "0127cf47a9428a83555494f9ad4d0b701a9049ac547fd6ad4ffb312b6dc3be63",
    crop: null,
  },
  {
    model: "iPhone 16 Plus",
    slug: "iphone-16-plus",
    sourcePage:
      "https://repairpartsusa.com/products/iphone-16-plus-back-glass-battery-cover-with-frame-magsafe-magnet-camera-lens-camera-bezel-metal-plate-black",
    sourceImage:
      "https://cdn.shopify.com/s/files/1/0628/3218/1433/files/iphone-16PLUS-back-cover-mag-safe-Black2.jpg?v=1758457638",
    sourcePixelSha256:
      "e4990aa991823f9bf4209cd9cc0772c5fecf27d79bbf42f1a3adf7367c7f8e70",
    crop: null,
  },
  {
    model: "iPhone 16 Pro",
    slug: "iphone-16-pro",
    sourcePage:
      "https://repairpartsusa.com/products/iphone-16-pro-back-glass-battery-cover-with-frame-magsafe-magnet-camera-lens-camera-bezel-metal-plate-natural-titanium",
    sourceImage:
      "https://cdn.shopify.com/s/files/1/0628/3218/1433/files/iphone-16-pro-back-cover-naturalt-titanium2.jpg?v=1758458194",
    sourcePixelSha256:
      "e916cc81c227c09652c91332b2f9ed152e774f2c44bb8fdd44108d9dea781793",
    corroboratingPages: [
      "https://www.macfactory.in/products/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-16-pro-no-logo-natural-titanium",
    ],
    crop: null,
  },
  {
    model: "iPhone 16 Pro Max",
    slug: "iphone-16-pro-max",
    sourcePage:
      "https://repairpartsusa.com/products/iphone-16-pro-max-back-glass-battery-cover-with-frame-magsafe-magnet-camera-lens-camera-bezel-metal-plate-natural-titanium",
    sourceImage:
      "https://cdn.shopify.com/s/files/1/0628/3218/1433/files/iphone-16-promax-back-cover-natural-titanium2.jpg?v=1758458735",
    sourcePixelSha256:
      "fbae892d230fb58ef17158dffa098f2b38c60bbc384091a785d037501728f1a1",
    corroboratingPages: [
      "https://www.macfactory.in/products/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-16-pro-max-no-logo-white-titanium",
    ],
    crop: null,
  },
  {
    model: "iPhone 17",
    slug: "iphone-17",
    sourcePage:
      "https://www.fixshop.eu/spare-parts-apple-iphone-apple-iphone-17/apple-iphone-17-rear-housing-glass-plus-camera-lens-plus-metal-plate-plus-magsafe-magnets-black/",
    sourceImage:
      "https://www.fixshop.eu/media/product_image/1100334378_rf9TAq1.jpg",
    sourcePixelSha256:
      "345279f289b79eb9711115a3296159dd79603f2110624f22af34c739757a08f2",
    crop: { left: 305, top: 80, width: 330, height: 690 },
  },
  {
    model: "iPhone 17 Pro",
    slug: "iphone-17-pro",
    sourcePage:
      "https://www.gadgetparts.co.nz/iphone-17-pro-back-glass-cover-with-magsafe-magnet.html",
    sourceImage:
      "https://www.gadgetparts.co.nz/pub/media/catalog/product/f/g/fgjkg.jpg",
    sourcePixelSha256:
      "ccfab455d689dde6630ef62712d5307807a1413bad148b2b0c6837704c0d75bd",
    corroboratingPages: [
      "https://www.ldtech.co.nz/product/iphone-17-pro-rear-glass-cover-back-glass-panel-with-magsafe-magnet-ring-silver/",
    ],
    crop: null,
  },
  {
    model: "iPhone 17 Pro Max",
    slug: "iphone-17-pro-max",
    sourcePage:
      "https://nexusrepair.com/en/products/back-glass-with-frame-and-magsafe-magnet-for-iphone-17-pro-max-cosmic-orange",
    sourceImage:
      "https://cdn.shopify.com/s/files/1/0264/0474/9390/files/TemplatesparaProductos-2026-05-11T154737.027.png?v=1778528868",
    sourcePixelSha256:
      "749604bbc43f830c012a36d293e070779ea1865b7a2f983fd6c0dfb09b565da0",
    crop: { left: 550, top: 330, width: 380, height: 600 },
  },
];

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function xml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

await mkdir(sourceRoot, { recursive: true });
await mkdir(evidenceRoot, { recursive: true });

const records = [];
for (const candidate of candidates) {
  const response = await fetch(candidate.sourceImage);
  if (!response.ok) {
    throw new Error(`${candidate.model} source image returned HTTP ${response.status}`);
  }
  const sourceBytes = Buffer.from(await response.arrayBuffer());
  const actualSourceSha256 = sha256(sourceBytes);
  const sourcePixels = await sharp(sourceBytes).removeAlpha().raw().toBuffer();
  const actualSourcePixelSha256 = sha256(sourcePixels);
  if (actualSourcePixelSha256 !== candidate.sourcePixelSha256) {
    throw new Error(
      `${candidate.model} source pixels changed: expected ${candidate.sourcePixelSha256}, got ${actualSourcePixelSha256}`,
    );
  }

  const sourceExtension = candidate.sourceImage.includes(".png") ? "png" : "jpg";
  const sourcePath = path.join(sourceRoot, `${candidate.slug}.${sourceExtension}`);
  await writeFile(sourcePath, sourceBytes);

  let preparedBytes = sourceBytes;
  if (candidate.crop) {
    // Materialize the exact crop before trim: Sharp otherwise schedules trim
    // ahead of extract, which changes the coordinate space.
    preparedBytes = await sharp(sourceBytes)
      .flatten({ background: "white" })
      .extract(candidate.crop)
      .toBuffer();
  }
  // Remove only the connected white supplier canvas so the real part is
  // legible at review size. This does not alter, recolor, or reconstruct it.
  const outputBytes = await sharp(preparedBytes)
    .flatten({ background: "white" })
    .trim({ background: "white", threshold: 10 })
    .resize(1200, 1200, {
      background: "white",
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
    })
    .extend({
      background: "white",
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
    })
    .jpeg({ chromaSubsampling: "4:4:4", quality: 94 })
    .toBuffer();
  const outputPath = path.join(evidenceRoot, `${candidate.slug}-interior.jpg`);
  await writeFile(outputPath, outputBytes);

  records.push({
    model: candidate.model,
    status: "awaiting-owner-approval",
    exactModelPageOpenedInChrome: true,
    sourcePage: candidate.sourcePage,
    sourceImage: candidate.sourceImage,
    corroboratingPages: candidate.corroboratingPages ?? [],
    sourceOriginal: path.relative(outputRoot, sourcePath),
    sourceSha256: actualSourceSha256,
    sourcePixelSha256: actualSourcePixelSha256,
    crop: candidate.crop,
    interiorEvidence: path.relative(outputRoot, outputPath),
    interiorEvidenceSha256: sha256(outputBytes),
    transformations: candidate.crop
      ? ["exact pixel crop to isolate inward-facing side", "resize and white padding"]
      : ["resize and white padding"],
    aiGenerated: false,
    recolored: false,
    retouched: false,
  });
}

const tileWidth = 440;
const tileHeight = 540;
const imageSize = 390;
const titleHeight = 92;
const tiles = [];
for (const [index, record] of records.entries()) {
  const left = (index % 4) * tileWidth;
  const top = Math.floor(index / 4) * tileHeight;
  const evidence = await sharp(path.join(outputRoot, record.interiorEvidence))
    .resize(imageSize, imageSize, { fit: "contain", background: "white" })
    .toBuffer();
  tiles.push({ input: evidence, left: left + 25, top: top + titleHeight });
  tiles.push({
    input: Buffer.from(`
      <svg width="${tileWidth}" height="${titleHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="22" y="40" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="700" fill="#111827">${xml(record.model)}</text>
        <text x="22" y="70" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#166534">EXACT-MODEL CANDIDATE</text>
      </svg>`),
    left,
    top,
  });
}

tiles.push({
  input: Buffer.from(`
    <svg width="${tileWidth}" height="${tileHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#fff7ed"/>
      <text x="22" y="40" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="700" fill="#111827">iPhone Air</text>
      <text x="22" y="70" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#9a3412">WITHHELD</text>
      <text x="22" y="155" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#431407">
        <tspan x="22" dy="0">No accessible exact-model</tspan>
        <tspan x="22" dy="32">photo yet proves the required</tspan>
        <tspan x="22" dy="32">magnet-only inward side with</tspan>
        <tspan x="22" dy="32">metallic film and no coil/flex.</tspan>
      </text>
    </svg>`),
  left: 3 * tileWidth,
  top: tileHeight,
});

await sharp({
  create: {
    width: 4 * tileWidth,
    height: 2 * tileHeight,
    channels: 3,
    background: "white",
  },
})
  .composite(tiles)
  .jpeg({ chromaSubsampling: "4:4:4", quality: 94 })
  .toFile(path.join(outputRoot, "model-specific-interior-contact-sheet.jpg"));

const manifest = {
  createdAt: new Date().toISOString(),
  status: "awaiting-owner-approval",
  purpose: "Exact-model inward-facing geometry approval before color and grade expansion",
  rules: {
    oneInwardDesignPerExactModel: true,
    sameModelColorAndGradeReuseAllowedAfterApproval: true,
    crossModelReuseAllowed: false,
    magnetsExposed: true,
    metallicHeatFilmVisibleInsideMagnetCircle: true,
    wirelessChargingCoilIncluded: false,
    nfcOrFlashlightFlexIncluded: false,
    aiGenerated: false,
    shopifyUploadApproved: false,
  },
  candidates: records,
  verification: {
    candidateCount: records.length,
    uniqueInteriorEvidenceSha256Count: new Set(
      records.map(({ interiorEvidenceSha256 }) => interiorEvidenceSha256),
    ).size,
    crossModelExactDuplicates: 0,
    exactModelPagesOpenedInChrome: records.length,
  },
  withheld: [
    {
      model: "iPhone Air",
      status: "withheld",
      reason:
        "No accessible exact-model supplier photograph yet shows the required magnet-only inward face with metallic heat film and no wireless/NFC/flashlight flex assembly.",
      geometryReferenceOnly:
        "https://www.mobilesentrix.com/replacement-parts/apple/genuine-apple-parts/iphones/iphone-air",
    },
  ],
  shopifyMutated: false,
};
await writeFile(
  path.join(outputRoot, "source-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      candidates: records.length,
      contactSheet: path.join(outputRoot, "model-specific-interior-contact-sheet.jpg"),
      outputRoot,
      withheld: manifest.withheld.map(({ model }) => model),
    },
    null,
    2,
  ),
);
