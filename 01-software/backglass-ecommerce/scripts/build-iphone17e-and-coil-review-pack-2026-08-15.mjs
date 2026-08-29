import crypto from "node:crypto";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

throw new Error(
  "RETIRED: this builder generated rejected coil-installed iPhone 17e product candidates. Use only an exact-model iPhone 17e source with exposed magnets and metallic film and no charging/NFC/flashlight flex installed.",
);

const OUTPUT_ROOT = path.resolve(
  "/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-17e-and-magsafe-coils/2026-08-15/awaiting-approval",
);
const IPHONE_ROOT = path.join(OUTPUT_ROOT, "iphone-17e");
const COIL_ROOT = path.join(OUTPUT_ROOT, "magsafe-coils");
const QA_ROOT = path.join(OUTPUT_ROOT, "design-qa");

const REFERENCE_IMAGE = path.resolve(
  "/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/iphone-16-and-17-model-specific-half-assembly-no-coil/2026-08-14/model-name-overlay-awaiting-approval/design-qa/reference-90-iphone-16-pro-max-black.png",
);
const COIL_SOURCE_ROOT = path.resolve(
  "/Users/jason/Desktop/Michael's back glass business/02-assets/product-previews/nfc-charging-coils/2026-08-09",
);
const COIL_SOURCE_MANIFEST = path.join(
  COIL_SOURCE_ROOT,
  "supplier-source-manifest.tsv",
);
const MICHAEL_REFERENCE_INVENTORY = path.join(
  COIL_SOURCE_ROOT,
  "reference-inventory.tsv",
);
const MICHAEL_SHEET_SNAPSHOT = path.join(
  COIL_SOURCE_ROOT,
  "source-snapshots/michael-magsafe-source-gid-0.csv",
);

const typography = {
  centerX: 530,
  mainTop: 900,
  mainWidth: 850,
  mainMaxHeight: 700,
};

const iphone17eSources = [
  {
    color: "Black",
    slug: "black",
    sourceColorLabel: "Black",
    sourcePageUrl:
      "https://www.mobilesentrix.ca/back-glass-w-magsafe-magnet-nfc-flashlight-flex-compatible-for-iphone-17e-genuine-oem-black",
    sourceImageUrl:
      "https://static.mobilesentrix.ca/catalog/product/image/1/7/1780132867-6a1aac035f249.webp",
  },
  {
    color: "White",
    slug: "white",
    sourceColorLabel: "White",
    sourcePageUrl:
      "https://www.mobilesentrix.ca/back-glass-w-magsafe-magnet-nfc-flashlight-flex-compatible-for-iphone-17e-genuine-oem-white",
    sourceImageUrl:
      "https://static.mobilesentrix.ca/catalog/product/image/1/7/1780132763-6a1aab9b96a6a.webp",
  },
  {
    color: "Soft Pink",
    slug: "soft-pink",
    sourceColorLabel: "Pink",
    sourcePageUrl:
      "https://www.mobilesentrix.ca/back-glass-w-magsafe-magnet-nfc-flashlight-flex-compatible-for-iphone-17e-genuine-oem-pink",
    sourceImageUrl:
      "https://static.mobilesentrix.ca/catalog/product/image/1/7/1780132661-6a1aab35eda14.webp",
  },
];

const identificationEvidence = {
  appleStoreUrl: "https://www.apple.com/us/shop/buy-iphone/iphone-17e",
  appleRepairManualUrl: "https://support.apple.com/en-ie/125956",
  ifixitTeardownUrl:
    "https://www.ifixit.com/News/116245/iphone-17e-teardown-reveals-an-upgrade-16e-owners-can-actually-use",
  ifixitComparisonImageUrl:
    "https://valkyrie.cdn.ifixit.com/media/2026/03/17095536/TD_iPhone17e_43.jpg",
  mobileSentrixExactCoilPageUrl:
    "https://www.mobilesentrix.ca/wireless-nfc-charging-flex-with-flashlight-flex-cable-for-iphone-17e",
  mobileSentrixCompatibleCoilPageUrl:
    "https://www.mobilesentrix.ca/wireless-nfc-charging-flex-with-flashlight-flex-cable-for-iphone-16e-17e",
  mayaResearchImageUrl:
    "https://mayacellularparts.com/media/catalog/product/1/6/16e_wireless_nfc.jpg",
};

const sha256 = (bytes) =>
  crypto.createHash("sha256").update(bytes).digest("hex");

function xml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function download(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "Mozilla/5.0" },
      });
      if (!response.ok) {
        throw new Error(
          `Download failed ${response.status} ${response.statusText}: ${url}`,
        );
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 750));
      }
    }
  }
  throw lastError;
}

function parseTsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const keys = header.split("\t");
  return rows.map((row) => {
    const values = row.split("\t");
    return Object.fromEntries(keys.map((key, index) => [key, values[index] ?? ""]));
  });
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

function tileLabel(title, subtitle, width, tone = "blocked") {
  const subtitleColor = tone === "ready" ? "#166534" : "#9a3412";
  return Buffer.from(`
    <svg width="${width}" height="104" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="22" y="40" font-family="Helvetica Neue, Arial, sans-serif" font-size="23" font-weight="700" fill="#111827">${xml(title)}</text>
      <text x="22" y="75" font-family="Helvetica Neue, Arial, sans-serif" font-size="16" font-weight="700" fill="${subtitleColor}">${xml(subtitle)}</text>
    </svg>`);
}

async function labeledTile(
  imagePath,
  title,
  subtitle,
  width,
  imageHeight,
  tone = "blocked",
) {
  const preview = await sharp(imagePath)
    .resize(width, imageHeight, { fit: "contain", background: "white" })
    .toBuffer();
  return sharp({
    create: {
      width,
      height: imageHeight + 104,
      channels: 3,
      background: "white",
    },
  })
    .composite([
      { input: tileLabel(title, subtitle, width, tone), left: 0, top: 0 },
      { input: preview, left: 0, top: 104 },
    ])
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

async function buildContactSheet({
  records,
  outputPath,
  cols,
  tileWidth,
  imageHeight,
  title,
  subtitle,
  tone,
}) {
  const tiles = await Promise.all(
    records.map((record) =>
      labeledTile(
        record.outputPath,
        title(record),
        subtitle(record),
        tileWidth,
        imageHeight,
        tone(record),
      ),
    ),
  );
  const rows = Math.ceil(tiles.length / cols);
  const tileHeight = imageHeight + 104;
  await sharp({
    create: {
      width: cols * tileWidth,
      height: rows * tileHeight,
      channels: 3,
      background: "white",
    },
  })
    .composite(
      tiles.map((input, index) => ({
        input,
        left: (index % cols) * tileWidth,
        top: Math.floor(index / cols) * tileHeight,
      })),
    )
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toFile(outputPath);
}

async function listFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(absolute)));
    else files.push(absolute);
  }
  return files;
}

await Promise.all([
  mkdir(path.join(IPHONE_ROOT, "source-originals"), { recursive: true }),
  mkdir(path.join(IPHONE_ROOT, "images"), { recursive: true }),
  mkdir(path.join(IPHONE_ROOT, "contact-sheets"), { recursive: true }),
  mkdir(path.join(IPHONE_ROOT, "evidence-only"), { recursive: true }),
  mkdir(path.join(COIL_ROOT, "source-originals"), { recursive: true }),
  mkdir(path.join(COIL_ROOT, "images"), { recursive: true }),
  mkdir(path.join(COIL_ROOT, "contact-sheets"), { recursive: true }),
  mkdir(path.join(COIL_ROOT, "research-candidates-not-for-shopify"), {
    recursive: true,
  }),
  mkdir(QA_ROOT, { recursive: true }),
]);

const overlay = await renderMeasuredText("17e");
const iphone17eRecords = [];

for (const source of iphone17eSources) {
  const sourceBytes = await download(source.sourceImageUrl);
  const sourceMetadata = await sharp(sourceBytes).metadata();
  if (sourceMetadata.width !== 2500 || sourceMetadata.height !== 2500) {
    throw new Error(
      `Expected 2500 x 2500 iPhone 17e source for ${source.color}, found ${sourceMetadata.width} x ${sourceMetadata.height}`,
    );
  }
  const sourcePath = path.join(
    IPHONE_ROOT,
    "source-originals",
    `mobilesentrix-iphone-17e-${source.slug}-genuine-oem.webp`,
  );
  await writeFile(sourcePath, sourceBytes);

  const normalized = await sharp(sourceBytes)
    .resize({ width: 2000, height: 2500, fit: "contain", background: "white" })
    .jpeg({ quality: 95, chromaSubsampling: "4:4:4" })
    .toBuffer();
  const outputBytes = await sharp(normalized)
    .composite([{ input: overlay.bytes, left: overlay.box.left, top: overlay.box.top }])
    .jpeg({ quality: 95, chromaSubsampling: "4:4:4" })
    .toBuffer();
  const outputPath = path.join(
    IPHONE_ROOT,
    "images",
    `iphone-17e-${source.slug}-exact-model-full-assembly-overlay-review-only.jpg`,
  );
  await writeFile(outputPath, outputBytes);

  iphone17eRecords.push({
    model: "iPhone 17e",
    color: source.color,
    sourceColorLabel: source.sourceColorLabel,
    sourcePageUrl: source.sourcePageUrl,
    sourceImageUrl: source.sourceImageUrl,
    sourcePath: path.relative(OUTPUT_ROOT, sourcePath),
    sourceSha256: sha256(sourceBytes),
    sourceDimensions: `${sourceMetadata.width}x${sourceMetadata.height}`,
    outputPath,
    output: path.relative(OUTPUT_ROOT, outputPath),
    outputSha256: sha256(outputBytes),
    outputDimensions: "2000x2500",
    overlayText: "17e",
    overlayVisibleGlyphBox: overlay.box,
    exactModelRealPhoto: true,
    exteriorColorVerified: true,
    inwardFaceStatus: "BLOCKED_COIL_AND_FLEX_INSTALLED",
    halfAssemblyNoCoilCompliant: false,
    shopifyEligible: false,
    transformations: [
      "proportional fit to a 2000 x 2500 white canvas",
      "measured model-name text overlay",
      "JPEG export",
    ],
    aiGenerated: false,
    recolored: false,
    syntheticReconstruction: false,
    michaelImagePixelsUsed: false,
    shopifyUploaded: false,
  });
}

const evidenceBytes = await download(identificationEvidence.ifixitComparisonImageUrl);
const evidencePath = path.join(
  IPHONE_ROOT,
  "evidence-only",
  "ifixit-iphone-16e-versus-17e-inward-face-comparison.jpg",
);
await writeFile(evidencePath, evidenceBytes);

const iphoneContactSheet = path.join(
  IPHONE_ROOT,
  "contact-sheets",
  "iphone-17e-three-color-exact-model-overlay-review.jpg",
);
await buildContactSheet({
  records: iphone17eRecords,
  outputPath: iphoneContactSheet,
  cols: 3,
  tileWidth: 650,
  imageHeight: 820,
  title: (record) => `iPHONE 17e · ${record.color.toUpperCase()}`,
  subtitle: () => "EXACT MODEL · FULL ASSEMBLY · BLOCKED",
  tone: () => "blocked",
});

const coilManifestRows = parseTsv(await readFile(COIL_SOURCE_MANIFEST, "utf8"));
const michaelReferenceRows = parseTsv(
  await readFile(MICHAEL_REFERENCE_INVENTORY, "utf8"),
).filter((row) => row.source_type === "Michael Drive");
const michaelSheet = await readFile(MICHAEL_SHEET_SNAPSHOT, "utf8");
if (!michaelSheet.includes("17e") || michaelReferenceRows.length !== 22) {
  throw new Error("Michael identification snapshot is incomplete.");
}

const selectedCoilRows = coilManifestRows.filter(
  (row) =>
    row.image_status === "READY_PREVIEW_ONLY" &&
    row.supplier === "MobileSentrix",
);
if (selectedCoilRows.length !== 14) {
  throw new Error(`Expected 14 MobileSentrix coil sources, found ${selectedCoilRows.length}.`);
}

const coilRecords = [];
for (const row of selectedCoilRows) {
  const sourcePath = path.join(COIL_SOURCE_ROOT, row.local_file);
  const sourceBytes = await readFile(sourcePath);
  if (sha256(sourceBytes) !== row.sha256) {
    throw new Error(`Supplier source hash mismatch for ${row.model}.`);
  }
  const sourceMetadata = await sharp(sourceBytes).metadata();
  const slug = row.model
    .toLowerCase()
    .replaceAll("iphone ", "iphone-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const sourceCopyPath = path.join(
    COIL_ROOT,
    "source-originals",
    `${slug}-supplier-original${path.extname(row.local_file)}`,
  );
  await copyFile(sourcePath, sourceCopyPath);
  const outputBytes = await sharp(sourceBytes)
    .resize({ width: 2000, height: 2500, fit: "contain", background: "white" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const outputPath = path.join(
    COIL_ROOT,
    "images",
    `${slug}-wireless-nfc-charging-flex-review.png`,
  );
  await writeFile(outputPath, outputBytes);
  coilRecords.push({
    model: row.model,
    michaelSheetCell: row.sheet_cell,
    supplier: row.supplier,
    sourcePageUrl: row.sheet_product_url,
    retrievalPageUrl: row.retrieval_product_url,
    sourceImageUrl: row.image_url,
    sourcePath: path.relative(OUTPUT_ROOT, sourceCopyPath),
    sourceSha256: row.sha256,
    sourceDimensions: `${sourceMetadata.width}x${sourceMetadata.height}`,
    outputPath,
    output: path.relative(OUTPUT_ROOT, outputPath),
    outputSha256: sha256(outputBytes),
    outputDimensions: "2000x2500",
    status: "READY_FOR_OWNER_REVIEW_NOT_FOR_SHOPIFY",
    rightsStatus: "UNVERIFIED",
    transformations: [
      "proportional fit to a 2000 x 2500 white canvas",
      "lossless PNG export",
    ],
    aiGenerated: false,
    recolored: false,
    syntheticReconstruction: false,
    michaelImagePixelsUsed: false,
    shopifyUploaded: false,
  });
}

const mayaResearchBytes = null;
const mayaMetadata = null;
const mayaResearchPath = null;
const mayaDownloadError =
  "Not downloaded: source is listed for iPhone 16e, so it is not eligible for the exact-model iPhone 17e review set.";

const coilContactSheet = path.join(
  COIL_ROOT,
  "contact-sheets",
  "michael-mapped-models-high-fidelity-coil-contact-sheet.jpg",
);
await buildContactSheet({
  records: coilRecords,
  outputPath: coilContactSheet,
  cols: 4,
  tileWidth: 500,
  imageHeight: 610,
  title: (record) => record.model.toUpperCase(),
  subtitle: () => "REAL SUPPLIER PHOTO · OWNER REVIEW",
  tone: () => "ready",
});

const iphoneBlack = iphone17eRecords.find(({ color }) => color === "Black");
const [referenceTile, implementationTile] = await Promise.all([
  labeledTile(
    REFERENCE_IMAGE,
    "90/100 OWNER REFERENCE",
    "NO-COIL INTERIOR · LABEL BASELINE",
    800,
    1000,
    "ready",
  ),
  labeledTile(
    iphoneBlack.outputPath,
    "iPHONE 17e SOURCE IMPLEMENTATION",
    "TEXT MATCHED · COIL STILL INSTALLED",
    800,
    1000,
    "blocked",
  ),
]);
const fullComparisonPath = path.join(
  QA_ROOT,
  "reference-90-versus-iphone-17e-full-comparison.jpg",
);
await sharp({
  create: { width: 1600, height: 1104, channels: 3, background: "white" },
})
  .composite([
    { input: referenceTile, left: 0, top: 0 },
    { input: implementationTile, left: 800, top: 0 },
  ])
  .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
  .toFile(fullComparisonPath);

const [referenceInterior, implementationInterior] = await Promise.all([
  sharp(REFERENCE_IMAGE)
    .extract({ left: 1000, top: 0, width: 1000, height: 2500 })
    .resize(700, 1000, { fit: "contain", background: "white" })
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toBuffer(),
  sharp(iphoneBlack.outputPath)
    .extract({ left: 1000, top: 0, width: 1000, height: 2500 })
    .resize(700, 1000, { fit: "contain", background: "white" })
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toBuffer(),
]);
const focusedComparisonPath = path.join(
  QA_ROOT,
  "focused-inward-face-no-coil-compliance-comparison.jpg",
);
await sharp({
  create: { width: 1400, height: 1000, channels: 3, background: "white" },
})
  .composite([
    { input: referenceInterior, left: 0, top: 0 },
    { input: implementationInterior, left: 700, top: 0 },
  ])
  .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
  .toFile(focusedComparisonPath);

const qaReportPath = path.join(QA_ROOT, "design-qa.md");
const qaReport = `# Design QA: iPhone 17e and MagSafe coil review pack

## Source visual truth

- Owner baseline: \`${REFERENCE_IMAGE}\` (2000 x 2500), scored 90/100.
- iPhone 17e exact-model source originals: three 2500 x 2500 MobileSentrix Genuine OEM photographs.
- Michael identification source: 22 Drive photographs indexed by \`${MICHAEL_REFERENCE_INVENTORY}\`; identification only, zero Michael pixels in outputs.

## Implementation screenshots

- Full comparison: \`${fullComparisonPath}\` (1600 x 1104).
- Focused inward-face comparison: \`${focusedComparisonPath}\` (1400 x 1000).
- iPhone 17e output state: exact-model full assembly with model text, 2000 x 2500, white canvas.
- Coil output state: 14 Michael-mapped models, 2000 x 2500 lossless PNGs.

## Required fidelity surfaces

- Fonts and typography: Helvetica Neue/Helvetica/Arial, weight 700, measured 850 px maximum label width, shared center x=530 and top=900. No actionable typography drift found.
- Spacing and layout rhythm: 2000 x 2500 canvas and the approved exterior-only safe box are consistent. No model label overlaps the inward-facing side.
- Colors and visual tokens: established cyan-to-lavender gradient at 0.82 opacity. Source color pixels are untouched; Soft Pink is not recolored from another variant.
- Image quality and asset fidelity: iPhone 17e sources are 2500 x 2500 exact-model photographs. Coil sources are supplier originals, mostly 2500 x 2500. No AI generation, synthetic reconstruction, recoloring, or Michael-photo pixels are used.
- Copy and content: model label is \`17e\`; official colors are Black, White, and Soft Pink.

## Findings

- [P1] iPhone 17e inward-facing image is a full assembly, not the required half assembly.
  - Location: all three iPhone 17e color outputs.
  - Evidence: focused comparison shows the charging coil/flex covering the internal magnet/heat-film area, while the owner baseline exposes the magnet ring and metallic film.
  - Impact: publishing would incorrectly represent the no-coil product and conflict with the separate-coil catalog structure.
  - Fix: replace all three inward-facing source views with one exact iPhone 17e magnet-only/no-coil supplier photograph; same inward face may then be reused only across iPhone 17e colors.
- [P1] No high-fidelity standalone iPhone 17e coil photo is currently available from the exact MobileSentrix listing.
  - Location: iPhone 17e coil slot.
  - Evidence: exact-model and 16e/17e-compatible MobileSentrix pages currently return placeholder product media; a separate Maya image URL is listed as iPhone 16e and is recorded only as research evidence.
  - Impact: assigning either image to iPhone 17e would overstate model certainty or image quality.
  - Fix: obtain an exact-model standalone 17e coil/flex supplier original, then compare its connector and shield geometry against Michael's reference and the iFixit teardown.

## Comparison history

- Pass 1: typography, placement, color fidelity, output dimensions, and the 14 mapped coil photos passed visual review.
- Pass 1 blockers retained: exact iPhone 17e no-coil inward face and exact standalone iPhone 17e coil are missing. No synthetic fix was attempted.

## Final result

blocked
`;
await writeFile(qaReportPath, qaReport);

const manifest = {
  createdAt: new Date().toISOString(),
  status: "AWAITING_OWNER_REVIEW_NOT_FOR_SHOPIFY",
  purpose:
    "Local-only iPhone 17e exact-model source review and high-fidelity MagSafe coil preparation",
  sourceTruth: {
    ownerReference: REFERENCE_IMAGE,
    ownerReferenceScore: 90,
    officialColors: ["Black", "White", "Soft Pink"],
    michaelReferenceInventory: MICHAEL_REFERENCE_INVENTORY,
    michaelReferencePhotoCount: michaelReferenceRows.length,
    michaelSheetSnapshot: MICHAEL_SHEET_SNAPSHOT,
    michaelImagePixelsUsed: false,
    identificationEvidence,
  },
  rules: {
    exactModelOnly: true,
    sameInwardFaceMayBeReusedOnlyAcrossSameModelColors: true,
    crossModelReuse: false,
    noCoilBackGlassRequired: true,
    aiGenerated: false,
    recolored: false,
    syntheticReconstruction: false,
    rightsStatus: "UNVERIFIED_REVIEW_ONLY",
    shopifyUploaded: false,
  },
  iphone17e: {
    status: "BLOCKED_EXACT_MODEL_FULL_ASSEMBLY_ONLY",
    records: iphone17eRecords.map(({ outputPath, ...record }) => record),
    contactSheet: path.relative(OUTPUT_ROOT, iphoneContactSheet),
    evidenceOnly: {
      path: path.relative(OUTPUT_ROOT, evidencePath),
      sha256: sha256(evidenceBytes),
      pixelsUsedInProductImages: false,
    },
  },
  magsafeCoils: {
    status: "14_READY_FOR_OWNER_REVIEW_IPHONE_17E_BLOCKED",
    readyCount: coilRecords.length,
    records: coilRecords.map(({ outputPath, ...record }) => record),
    contactSheet: path.relative(OUTPUT_ROOT, coilContactSheet),
    iphone17e: {
      status: "BLOCKED_NO_EXACT_HIGH_FIDELITY_STANDALONE_IMAGE",
      exactProductPageUrl: identificationEvidence.mobileSentrixExactCoilPageUrl,
      compatibleProductPageUrl:
        identificationEvidence.mobileSentrixCompatibleCoilPageUrl,
      researchCandidate: {
        sourcePageModelLabel: "iPhone 16e",
        path: mayaResearchPath ? path.relative(OUTPUT_ROOT, mayaResearchPath) : null,
        sourceImageUrl: identificationEvidence.mayaResearchImageUrl,
        dimensions: mayaMetadata
          ? `${mayaMetadata.width}x${mayaMetadata.height}`
          : null,
        sha256: mayaResearchBytes ? sha256(mayaResearchBytes) : null,
        downloadError: mayaDownloadError ?? null,
        shopifyEligible: false,
      },
    },
  },
  designQa: {
    finalResult: "blocked",
    report: path.relative(OUTPUT_ROOT, qaReportPath),
    fullComparison: path.relative(OUTPUT_ROOT, fullComparisonPath),
    focusedComparison: path.relative(OUTPUT_ROOT, focusedComparisonPath),
  },
};
await writeFile(
  path.join(OUTPUT_ROOT, "review-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

const readme = `# iPhone 17e and MagSafe coils - awaiting owner review

This folder is local-only. Nothing in it was uploaded to Shopify.

## iPhone 17e

- Three exact-model MobileSentrix Genuine OEM source photos were preserved at 2500 x 2500: Black, White, and Soft Pink.
- The approved model-name typography and placement were applied as \`17e\` without recoloring or AI generation.
- These are intentionally marked **blocked**: the source photos show the charging coil/flex installed. They are not compliant with the Half Assembly (No Coil) listing rule and must not be published.
- An exact-model magnet-only/no-coil inward-face source is still required. It must expose the model-specific magnets and metallic heat-dissipating film.

## MagSafe / wireless NFC charging flexes

- Fourteen models from Michael's model-to-supplier mapping were rebuilt from the untouched high-resolution supplier originals.
- Michael's 22 Drive photos were consulted only for physical identification. No pixels from those photos appear anywhere in this review pack.
- The exact iPhone 17e MobileSentrix coil listing currently has placeholder media. A separate iPhone 16e supplier-photo URL is recorded only as research evidence${mayaResearchPath ? " and its 1100 x 1100 source file is retained locally" : " (the source file could not be retrieved during this build)"}; it is not approved for iPhone 17e or Shopify.

## Review first

- Start with \`iphone-17e/contact-sheets/iphone-17e-three-color-exact-model-overlay-review.jpg\`.
- Review the coil set at \`magsafe-coils/contact-sheets/michael-mapped-models-high-fidelity-coil-contact-sheet.jpg\`.
- The QA report is \`design-qa/design-qa.md\` and remains blocked on the two exact-model source gaps above.

Rights to reuse supplier media have not been verified. All images remain review-only.
`;
await writeFile(path.join(OUTPUT_ROOT, "README.md"), readme);

const checksumFiles = (await listFiles(OUTPUT_ROOT))
  .filter((file) => path.basename(file) !== "SHA256SUMS")
  .sort();
const checksumLines = [];
for (const file of checksumFiles) {
  const bytes = await readFile(file);
  checksumLines.push(`${sha256(bytes)}  ${path.relative(OUTPUT_ROOT, file)}`);
}
await writeFile(
  path.join(OUTPUT_ROOT, "SHA256SUMS"),
  `${checksumLines.join("\n")}\n`,
);

const sourceSizes = await Promise.all(
  coilRecords.map(async (record) => ({
    model: record.model,
    bytes: (await stat(path.join(OUTPUT_ROOT, record.sourcePath))).size,
  })),
);

console.log(
  JSON.stringify(
    {
      outputRoot: OUTPUT_ROOT,
      iphone17eRecords: iphone17eRecords.length,
      iphone17eStatus: manifest.iphone17e.status,
      coilRecords: coilRecords.length,
      coilSourceBytes: sourceSizes.reduce((sum, item) => sum + item.bytes, 0),
      iphone17eCoilStatus: manifest.magsafeCoils.iphone17e.status,
      designQa: manifest.designQa.finalResult,
      shopifyUploaded: false,
    },
    null,
    2,
  ),
);
