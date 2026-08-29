import crypto from "node:crypto";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const reviewRoot = path.resolve("output/model-media-review-2026-08-14");
const sourceRoot = path.join(reviewRoot, "verified-no-coil-sources/phone-lcd-parts");
const replacementRoot = path.join(reviewRoot, "replacements-awaiting-approval");
const sourceManifestPath = path.join(sourceRoot, "source-manifest.json");
const sourceManifest = JSON.parse(await readFile(sourceManifestPath, "utf8"));

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const titleCase = (value) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const eligible = sourceManifest.records.filter((record) => record.eligibleForEdit);
const blocked = sourceManifest.records.filter((record) => !record.eligibleForEdit);

if (!eligible.length) throw new Error("No source records are eligible for review replacements.");
if (eligible.some((record) => record.primaryExteriorCrossModelReuse?.detected)) {
  throw new Error("An eligible primary source has cross-model image reuse.");
}

const seenSourceHashes = new Map();
for (const record of eligible) {
  const sourceHash = record.localFiles.exterior.sha256;
  const existing = seenSourceHashes.get(sourceHash);
  if (existing && existing.model !== record.model) {
    throw new Error(
      `Eligible exterior ${sourceHash} is reused across ${existing.model} and ${record.model}.`,
    );
  }
  seenSourceHashes.set(sourceHash, record);
}

await mkdir(replacementRoot, { recursive: true });
const outputs = [];

for (const record of eligible) {
  const sourcePath = path.resolve(reviewRoot, record.localFiles.exterior.relativePath);
  const sourceBytes = await readFile(sourcePath);
  if (sha256(sourceBytes) !== record.localFiles.exterior.sha256) {
    throw new Error(`Source hash changed for ${record.model}/${record.color}.`);
  }

  const targetDir = path.join(replacementRoot, record.model);
  await mkdir(targetDir, { recursive: true });
  const destination = path.join(
    targetDir,
    `${record.model}-${record.color}-half-assembly-no-coil-review.jpg`,
  );
  await sharp(sourceBytes)
    .rotate()
    .resize(2000, 2500, { fit: "contain", background: "white", withoutEnlargement: false })
    .flatten({ background: "white" })
    .jpeg({ quality: 95, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toFile(destination);

  const outputBytes = await readFile(destination);
  const metadata = await sharp(outputBytes).metadata();
  outputs.push({
    model: record.model,
    color: record.color,
    sku: record.sku,
    supplier: record.supplier,
    sourceProductUrl: record.url,
    sourceImageUrl: record.localFiles.exterior.sourceUrl,
    sourceRelativePath: record.localFiles.exterior.relativePath,
    sourceSha256: record.localFiles.exterior.sha256,
    outputRelativePath: path.relative(reviewRoot, destination),
    outputSha256: sha256(outputBytes),
    width: metadata.width,
    height: metadata.height,
    constructionVerified: {
      exactModelSku: true,
      chargingCoilIncluded: false,
      magnetsExposed: true,
      metallicHeatFilmVisibleInsideMagnetCircle: true,
      sourceImageCrossModelReuse: false,
      duplicatedSecondaryInteriorUsed: false,
    },
  });
}

const modelGroups = Map.groupBy(outputs, (output) => output.model);
const contactSheets = [];
for (const [model, modelOutputs] of modelGroups) {
  const cellWidth = 520;
  const imageHeight = 650;
  const labelHeight = 70;
  const columns = 3;
  const rows = Math.ceil(modelOutputs.length / columns);
  const composites = [];

  for (const [index, output] of modelOutputs.entries()) {
    const left = (index % columns) * cellWidth;
    const top = Math.floor(index / columns) * (imageHeight + labelHeight);
    const preview = await sharp(path.join(reviewRoot, output.outputRelativePath))
      .resize(cellWidth - 30, imageHeight - 20, { fit: "contain", background: "white" })
      .jpeg({ quality: 90 })
      .toBuffer();
    composites.push({ input: preview, left: left + 15, top: top + 10 });
    composites.push({
      input: Buffer.from(`<svg width="${cellWidth}" height="${labelHeight}">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="18" y="31" font-family="Arial, sans-serif" font-size="22" fill="#111827">${titleCase(output.color)}</text>
        <text x="18" y="56" font-family="Arial, sans-serif" font-size="16" fill="#047857">Exact SKU ${output.sku}</text>
      </svg>`),
      left,
      top: top + imageHeight,
    });
  }

  const destination = path.join(replacementRoot, model, `${model}-review-contact-sheet.jpg`);
  await sharp({
    create: {
      width: columns * cellWidth,
      height: rows * (imageHeight + labelHeight),
      channels: 3,
      background: "white",
    },
  })
    .composite(composites)
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(destination);
  const bytes = await readFile(destination);
  contactSheets.push({
    model,
    relativePath: path.relative(reviewRoot, destination),
    sha256: sha256(bytes),
  });
}

const blockedModels = [
  ...new Map(
    [
      ...sourceManifest.blockedModels,
      ...blocked.map((record) => ({
        model: record.model,
        reason: "The supplier reused the primary product photo across models; no replacement was created.",
      })),
    ].map((entry) => [entry.model, entry]),
  ).values(),
].sort((a, b) => a.model.localeCompare(b.model));

const manifest = {
  builtAt: new Date().toISOString(),
  status: "local-review-only-awaiting-jason-approval",
  shopifyMutated: false,
  shopifyUploadApproved: false,
  imageProcess: "Deterministic resize-and-pad of real supplier photos using Sharp; no generative or AI editing.",
  outputCount: outputs.length,
  modelsReadyForReview: [...modelGroups.keys()],
  blockedModels,
  sourceManifest: path.relative(reviewRoot, sourceManifestPath),
  outputs,
  contactSheets,
};

await writeFile(
  path.join(replacementRoot, "replacement-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(
  `Built ${outputs.length} local review images for ${modelGroups.size} models; ${blockedModels.length} models remain blocked.`,
);
