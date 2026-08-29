import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const reviewRoot = path.resolve("output/model-media-review-2026-08-14");
const interiorPackRoot = path.join(
  reviewRoot,
  "model-specific-interiors-awaiting-approval",
);
const outputRoot = path.join(
  reviewRoot,
  "color-grade-replacements-awaiting-approval",
);
const sourceRoot = path.join(outputRoot, "exterior-source-originals");
const replacementRoot = path.join(outputRoot, "replacement-images");
const contactSheetRoot = path.join(outputRoot, "contact-sheets");

const repairPartsBase = "https://repairpartsusa.com/products";
const fixShopBase = "https://www.fixshop.eu";

const models = [
  {
    model: "iPhone 16",
    slug: "iphone-16",
    colors: ["Black", "Pink", "Teal", "Ultramarine", "White"],
    interior: "iphone-16-interior.jpg",
    source: "repairpartsusa",
    handlePrefix:
      "iphone-16-back-glass-battery-cover-with-frame-magsafe-magnet-camera-lens-camera-bezel-metal-plate",
  },
  {
    model: "iPhone 16 Plus",
    slug: "iphone-16-plus",
    colors: ["Black", "Pink", "Teal", "Ultramarine", "White"],
    interior: "iphone-16-plus-interior.jpg",
    source: "repairpartsusa",
    handlePrefix:
      "iphone-16-plus-back-glass-battery-cover-with-frame-magsafe-magnet-camera-lens-camera-bezel-metal-plate",
  },
  {
    model: "iPhone 16 Pro",
    slug: "iphone-16-pro",
    colors: [
      "Black Titanium",
      "Desert Titanium",
      "Natural Titanium",
      "White Titanium",
    ],
    interior: "iphone-16-pro-interior.jpg",
    source: "repairpartsusa",
    handlePrefix:
      "iphone-16-pro-back-glass-battery-cover-with-frame-magsafe-magnet-camera-lens-camera-bezel-metal-plate",
  },
  {
    model: "iPhone 16 Pro Max",
    slug: "iphone-16-pro-max",
    colors: [
      "Black Titanium",
      "Desert Titanium",
      "Natural Titanium",
      "White Titanium",
    ],
    interior: "iphone-16-pro-max-interior.jpg",
    source: "repairpartsusa",
    handlePrefix:
      "iphone-16-pro-max-back-glass-battery-cover-with-frame-magsafe-magnet-camera-lens-camera-bezel-metal-plate",
  },
  {
    model: "iPhone 17",
    slug: "iphone-17",
    colors: ["Black", "Lavender", "Mist Blue", "Sage", "White"],
    interior: "iphone-17-interior.jpg",
    source: "fixshop-base",
  },
  {
    model: "iPhone 17 Pro",
    slug: "iphone-17-pro",
    colors: ["Cosmic Orange", "Deep Blue", "Silver"],
    interior: "iphone-17-pro-interior.jpg",
    source: "fixshop-pro",
  },
  {
    model: "iPhone 17 Pro Max",
    slug: "iphone-17-pro-max",
    colors: ["Cosmic Orange", "Deep Blue", "Silver"],
    interior: "iphone-17-pro-max-interior.jpg",
    source: "fixshop-pro-max",
  },
];

const colorSlug = (color) => color.toLowerCase().replaceAll(" ", "-");
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function xml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function expectedTitleFragment(model, color) {
  return `${model.toLowerCase()}|${color.toLowerCase()}`;
}

async function downloadRepairPartsExterior(model, color) {
  const handle = `${model.handlePrefix}-${colorSlug(color)}`;
  const sourcePage = `${repairPartsBase}/${handle}`;
  const response = await fetch(`${sourcePage}.js`);
  if (!response.ok) throw new Error(`${sourcePage}.js returned HTTP ${response.status}`);
  const product = await response.json();
  const normalizedTitle = product.title.toLowerCase();
  const [expectedModel, expectedColor] = expectedTitleFragment(model.model, color).split("|");
  if (!normalizedTitle.includes(expectedModel) || !normalizedTitle.includes(expectedColor)) {
    throw new Error(`Unexpected RepairPartsUSA product title: ${product.title}`);
  }
  const sourceImage = new URL(product.images[0], sourcePage).href;
  const imageResponse = await fetch(sourceImage);
  if (!imageResponse.ok) {
    throw new Error(`${sourceImage} returned HTTP ${imageResponse.status}`);
  }
  return {
    pageHttpStatus: response.status,
    pageTitle: product.title,
    sourceBytes: Buffer.from(await imageResponse.arrayBuffer()),
    sourceImage,
    sourcePage,
    // RepairPartsUSA already supplies a clean exterior + exact-model inward
    // pair. Preserve that real supplier composition instead of duplicating the
    // inward face in a second panel.
    useWholeSupplierComposite: true,
    exteriorCrop: null,
  };
}

function fixShopColorSlug(color) {
  if (color === "Cosmic Orange") return "orange";
  if (color === "Deep Blue") return "dark-blue";
  return colorSlug(color);
}

async function downloadFixShopExterior(model, color) {
  const supplierColor = fixShopColorSlug(color);
  let sourcePage;
  if (model.source === "fixshop-base") {
    sourcePage = `${fixShopBase}/spare-parts-apple-iphone-apple-iphone-17/apple-iphone-17-rear-housing-glass-plus-camera-lens-plus-metal-plate-plus-magsafe-magnets-${supplierColor}/`;
  } else {
    const modelPath = model.source === "fixshop-pro" ? "iphone-17-pro" : "iphone-17-pro-max";
    sourcePage = `${fixShopBase}/spare-parts-apple-iphone-apple-${modelPath}/rear-housing-glass-with-magsafe-for-${modelPath}-${supplierColor}/`;
  }
  const response = await fetch(sourcePage);
  if (!response.ok) throw new Error(`${sourcePage} returned HTTP ${response.status}`);
  const html = await response.text();
  const pageTitle = html.match(/<title>([^<]+)/)?.[1]?.trim();
  const sourceImage = html.match(
    /<meta property="og:image" content="([^"]+)/,
  )?.[1];
  if (!pageTitle || !sourceImage) {
    throw new Error(`Could not parse exact FixShop source: ${sourcePage}`);
  }
  const normalizedTitle = pageTitle.toLowerCase();
  const [expectedModel, expectedColor] = expectedTitleFragment(model.model, color).split("|");
  const colorMatches =
    normalizedTitle.includes(expectedColor) ||
    (color === "Cosmic Orange" && normalizedTitle.includes("orange")) ||
    (color === "Deep Blue" && normalizedTitle.includes("dark blue"));
  if (!normalizedTitle.includes(expectedModel) || !colorMatches) {
    throw new Error(`Unexpected FixShop product title: ${pageTitle}`);
  }
  const imageResponse = await fetch(sourceImage);
  if (!imageResponse.ok) {
    throw new Error(`${sourceImage} returned HTTP ${imageResponse.status}`);
  }
  return {
    pageHttpStatus: response.status,
    pageTitle,
    sourceBytes: Buffer.from(await imageResponse.arrayBuffer()),
    sourceImage,
    sourcePage,
    useWholeSupplierComposite: model.source === "fixshop-base",
    exteriorCrop:
      model.source === "fixshop-base"
        ? null
        : { left: 50, top: 120, width: 350, height: 560 },
  };
}

async function exteriorFor(model, color) {
  if (model.source === "repairpartsusa") {
    return downloadRepairPartsExterior(model, color);
  }
  return downloadFixShopExterior(model, color);
}

async function fitImage(input, width, height) {
  return sharp(input)
    .flatten({ background: "white" })
    .resize(width, height, {
      background: "white",
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
    })
    .jpeg({ chromaSubsampling: "4:4:4", quality: 95 })
    .toBuffer();
}

async function buildSideBySide(exteriorBytes, exteriorCrop, interiorBytes) {
  let exteriorPipeline = sharp(exteriorBytes).flatten({ background: "white" });
  if (exteriorCrop) exteriorPipeline = exteriorPipeline.extract(exteriorCrop);
  const exterior = await exteriorPipeline
    .resize(900, 1900, {
      background: "white",
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
    })
    .jpeg({ chromaSubsampling: "4:4:4", quality: 95 })
    .toBuffer();
  const interior = await fitImage(interiorBytes, 900, 1900);
  return sharp({
    create: {
      width: 2000,
      height: 2500,
      channels: 3,
      background: "white",
    },
  })
    .composite([
      { input: exterior, left: 50, top: 300 },
      { input: interior, left: 1050, top: 300 },
    ])
    .jpeg({ chromaSubsampling: "4:4:4", quality: 95 })
    .toBuffer();
}

await mkdir(sourceRoot, { recursive: true });
await mkdir(replacementRoot, { recursive: true });
await mkdir(contactSheetRoot, { recursive: true });

const interiorManifest = JSON.parse(
  await readFile(path.join(interiorPackRoot, "source-manifest.json"), "utf8"),
);
const records = [];

for (const model of models) {
  const modelOutputRoot = path.join(replacementRoot, model.slug);
  const modelSourceRoot = path.join(sourceRoot, model.slug);
  await mkdir(modelOutputRoot, { recursive: true });
  await mkdir(modelSourceRoot, { recursive: true });
  const interiorPath = path.join(
    interiorPackRoot,
    "interior-evidence",
    model.interior,
  );
  const interiorBytes = await readFile(interiorPath);
  const interiorRecord = interiorManifest.candidates.find(
    ({ model: candidateModel }) => candidateModel === model.model,
  );
  if (!interiorRecord) throw new Error(`Missing interior record for ${model.model}`);

  for (const color of model.colors) {
    const source = await exteriorFor(model, color);
    const sourcePixelBytes = await sharp(source.sourceBytes)
      .removeAlpha()
      .raw()
      .toBuffer();
    const sourceExtension = source.sourceImage.includes(".png") ? "png" : "jpg";
    const sourcePath = path.join(
      modelSourceRoot,
      `${colorSlug(color)}.${sourceExtension}`,
    );
    await writeFile(sourcePath, source.sourceBytes);

    const outputBytes = source.useWholeSupplierComposite
      ? await fitImage(source.sourceBytes, 2000, 2500)
      : await buildSideBySide(
          source.sourceBytes,
          source.exteriorCrop,
          interiorBytes,
        );
    const outputFilename = `${model.slug}-${colorSlug(color)}-half-assembly-no-coil-review.jpg`;
    const outputPath = path.join(modelOutputRoot, outputFilename);
    await writeFile(outputPath, outputBytes);

    records.push({
      model: model.model,
      color,
      gradesUsingSameExactModelAndColorPhoto: ["A Grade", "Premium"],
      proposedProductTitles: [
        `${model.model} Back Glass Half Assembly (No Coil) - A Grade`,
        `${model.model} Back Glass Half Assembly (No Coil) - Premium`,
      ],
      sourcePage: source.sourcePage,
      sourcePageTitle: source.pageTitle,
      sourcePageHttpStatus: source.pageHttpStatus,
      exteriorSourceImage: source.sourceImage,
      exteriorSourceOriginal: path.relative(outputRoot, sourcePath),
      exteriorSourceSha256: sha256(source.sourceBytes),
      exteriorSourcePixelSha256: sha256(sourcePixelBytes),
      exteriorCrop: source.exteriorCrop,
      interiorEvidence: path.relative(outputRoot, interiorPath),
      interiorEvidenceSha256: sha256(interiorBytes),
      interiorExactModelSourcePage: interiorRecord.sourcePage,
      output: path.relative(outputRoot, outputPath),
      outputSha256: sha256(outputBytes),
      transformations: source.useWholeSupplierComposite
        ? ["resize and white padding of exact-model exact-color supplier composite"]
        : [
            ...(source.exteriorCrop
              ? ["exact pixel crop to isolate the exact-color exterior"]
              : []),
            "side-by-side composition with the approved exact-model inward candidate",
            "resize and white padding",
          ],
      aiGenerated: false,
      recolored: false,
      retouched: false,
      shopifyUploaded: false,
    });
  }
}

for (const model of models) {
  const modelRecords = records.filter(({ model: value }) => value === model.model);
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
      input: Buffer.from(`
        <svg width="${tileWidth}" height="90" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f3f4f6"/>
          <text x="20" y="37" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#111827">${xml(record.color)}</text>
          <text x="20" y="67" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="#166534">A GRADE + PREMIUM</text>
        </svg>`),
      left: index * tileWidth,
      top: 0,
    });
  }
  await sharp({
    create: { width, height: tileHeight, channels: 3, background: "white" },
  })
    .composite(composites)
    .jpeg({ chromaSubsampling: "4:4:4", quality: 94 })
    .toFile(path.join(contactSheetRoot, `${model.slug}-contact-sheet.jpg`));
}

const manifest = {
  createdAt: new Date().toISOString(),
  status: "awaiting-owner-approval",
  purpose:
    "Exact-model, exact-color half-assembly media review mapped to the store's A Grade and Premium organization",
  rules: {
    oneInwardDesignPerExactModel: true,
    sameModelColorAndGradeReuseAllowed: true,
    crossModelReuseAllowed: false,
    magnetsExposed: true,
    metallicHeatFilmVisibleInsideMagnetCircle: true,
    wirelessChargingCoilIncluded: false,
    nfcOrFlashlightFlexIncluded: false,
    exactModelAndColorExteriorSourceRequired: true,
    aiGenerated: false,
    shopifyUploadApproved: false,
  },
  counts: {
    models: models.length,
    colors: records.length,
    gradeTargets: records.length * 2,
    uniqueInteriorEvidenceFiles: new Set(
      records.map(({ interiorEvidenceSha256 }) => interiorEvidenceSha256),
    ).size,
    uniqueOutputFiles: new Set(records.map(({ outputSha256 }) => outputSha256)).size,
  },
  verification: {
    exactModelPagesReturningHttp200: records.filter(
      ({ sourcePageHttpStatus }) => sourcePageHttpStatus === 200,
    ).length,
    modelsWithExactlyOneInteriorEvidenceHash: models.filter((model) => {
      const hashes = new Set(
        records
          .filter(({ model: recordModel }) => recordModel === model.model)
          .map(({ interiorEvidenceSha256 }) => interiorEvidenceSha256),
      );
      return hashes.size === 1;
    }).length,
    interiorEvidenceHashesUsedAcrossMultipleModels: [
      ...new Set(records.map(({ interiorEvidenceSha256 }) => interiorEvidenceSha256)),
    ].filter((hash) => {
      const modelsUsingHash = new Set(
        records
          .filter(({ interiorEvidenceSha256 }) => interiorEvidenceSha256 === hash)
          .map(({ model }) => model),
      );
      return modelsUsingHash.size > 1;
    }),
    allOutputsUnique: new Set(records.map(({ outputSha256 }) => outputSha256)).size === records.length,
    allRecordsNonAi: records.every(({ aiGenerated }) => aiGenerated === false),
    allRecordsNotUploaded: records.every(
      ({ shopifyUploaded }) => shopifyUploaded === false,
    ),
  },
  records,
  withheld: [
    {
      model: "iPhone Air",
      colors: ["Cloud White", "Light Gold", "Sky Blue", "Space Black"],
      grades: ["A Grade", "Premium"],
      reason:
        "No accessible exact-model supplier photograph yet shows the required magnet-only inward face with metallic heat film and no wireless/NFC/flashlight flex assembly.",
    },
  ],
  shopifyMutated: false,
};

await writeFile(
  path.join(outputRoot, "replacement-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      outputRoot,
      counts: manifest.counts,
      withheld: manifest.withheld.map(({ model }) => model),
    },
    null,
    2,
  ),
);
