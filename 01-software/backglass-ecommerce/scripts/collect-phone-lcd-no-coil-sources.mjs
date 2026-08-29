import crypto from "node:crypto";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const reviewRoot = path.resolve("output/model-media-review-2026-08-14");
const sourceRoot = path.join(reviewRoot, "verified-no-coil-sources/phone-lcd-parts");

const externalExactModelCorroboration = {
  "iphone-16-pro": {
    supplier: "MacFactory",
    productUrl:
      "https://www.macfactory.in/products/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-16-pro-no-logo-natural-titanium",
    imageUrl:
      "https://www.macfactory.in/cdn/shop/files/1741591988-67ce95b44cff1_1800x.webp?v=1742452696",
    note: "Exact iPhone 16 Pro magnet-only product page shows a distinct internal geometry.",
  },
  "iphone-16-pro-max": {
    supplier: "MacFactory",
    productUrl:
      "https://www.macfactory.in/products/back-glass-with-steel-plate-with-magsafe-magnet-pre-installed-compatible-for-iphone-16-pro-max-no-logo-white-titanium",
    imageUrl:
      "https://www.macfactory.in/cdn/shop/files/1741593108-67ce9a147f2f8_1800x.webp?v=1742194743",
    note: "Exact iPhone 16 Pro Max magnet-only product page shows a distinct internal geometry.",
  },
};

const rows = [
  ...[
    ["black", "blk"],
    ["pink", "pnk"],
    ["teal", "teal"],
    ["ultramarine", "blu"],
    ["white", "wht"],
  ].map(([color, code]) => ({
    model: "iphone-16",
    color,
    sku: `16-BHBC-${code.toUpperCase()}`,
    url: `https://www.phonelcdparts.com/apple/iphone-parts/iphone-16/back-glass-with-frame-and-magsafe-magnet-for-iphone-16-no-logo-${color}-16-bhbc-${code}`,
  })),
  ...[
    ["black", "blk"],
    ["pink", "pnk"],
    ["teal", "teal"],
    ["ultramarine", "blu"],
    ["white", "wht"],
  ].map(([color, code]) => ({
    model: "iphone-16-plus",
    color,
    sku: `16PL-BHBC-${code.toUpperCase()}`,
    url: `https://www.phonelcdparts.com/apple/iphone-parts/iphone-16-plus/back-glass-with-frame-and-magsafe-magnet-for-iphone-16-plus-no-logo-${color}-16pl-bhbc-${code}`,
  })),
  ...[
    ["black-titanium", "black", "blk"],
    ["desert-titanium", "gold", "gld"],
    ["natural-titanium", "natural", "ntr"],
    ["white-titanium", "white", "wht"],
  ].map(([color, slugColor, code]) => ({
    model: "iphone-16-pro",
    color,
    sku: `16P-BHBC-${code.toUpperCase()}`,
    url: `https://www.phonelcdparts.com/apple/iphone-parts/iphone-16-pro/back-glass-with-frame-and-magsafe-magnet-for-iphone-16-pro-no-logo-${slugColor}-16p-bhbc-${code}`,
  })),
  ...[
    ["black-titanium", "black", "blk"],
    ["desert-titanium", "gold", "gld"],
    ["natural-titanium", "natural", "ntr"],
    ["white-titanium", "white", "wht"],
  ].map(([color, slugColor, code]) => ({
    model: "iphone-16-pro-max",
    color,
    sku: `16PM-BHBC-${code.toUpperCase()}`,
    url: `https://www.phonelcdparts.com/apple/iphone-parts/iphone-16-pro-max/back-glass-with-frame-and-magsafe-magnet-for-iphone-16-pro-max-no-logo-${slugColor}-16pm-bhbc-${code}`,
  })),
  ...[
    ["black", "blk"],
    ["lavender", "lvd"],
    ["mist-blue", "mblu"],
    ["sage", "grn"],
    ["white", "wht"],
  ].map(([color, code]) => ({
    model: "iphone-17",
    color,
    sku: `17-BHBC-${code.toUpperCase()}`,
    url: `https://www.phonelcdparts.com/apple/iphone-parts/iphone-17/back-glass-with-frame-and-magsafe-magnet-for-iphone-17-no-logo-${color}-17-bhbc-${code}`,
  })),
  ...[
    ["cosmic-orange", "org"],
    ["deep-blue", "dblu"],
    ["silver", "slv"],
  ].map(([color, code]) => ({
    model: "iphone-17-pro",
    color,
    sku: `17P-BHBC-${code.toUpperCase()}`,
    url: `https://www.phonelcdparts.com/apple/iphone-parts/iphone-17-pro/back-glass-with-frame-and-magsafe-magnet-for-iphone-17-pro-no-logo-${color}-17p-bhbc-${code}`,
  })),
  ...[
    ["cosmic-orange", "org"],
    ["deep-blue", "dblu"],
    ["silver", "slv"],
  ].map(([color, code]) => ({
    model: "iphone-17-pro-max",
    color,
    sku: `17PM-BHBC-${code.toUpperCase()}`,
    url: `https://www.phonelcdparts.com/apple/iphone-parts/iphone-17-pro-max/back-glass-with-frame-and-magsafe-magnet-for-iphone-17-pro-max-no-logo-${color}-17pm-bhbc-${code}`,
  })),
];

const titleCase = (value) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

async function fetchBytes(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (catalog evidence collection)" },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

function galleryUrls(html) {
  const productId = html.match(/MagicZoomPlusImage-product-(\d+)/)?.[1];
  if (!productId) throw new Error("Product gallery ID was not found");
  const pattern = new RegExp(
    `data-zoom-id="MagicZoomPlusImage-product-${productId}"[^>]+data-image="([^"]+)"`,
    "g",
  );
  return [...html.matchAll(pattern)].map((match) =>
    match[1]
      .replaceAll("&amp;", "&")
      .replace(/\/media\/catalog\/product\/cache\/[a-f0-9]+\//, "/media/catalog/product/"),
  );
}

async function buildPrimaryEvidenceSheet(records) {
  const modelRecords = [...new Map(records.map((record) => [record.model, record])).values()];
  const cellWidth = 600;
  const imageHeight = 760;
  const labelHeight = 70;
  const columns = 4;
  const composites = [];

  for (const [index, record] of modelRecords.entries()) {
    const left = (index % columns) * cellWidth;
    const top = Math.floor(index / columns) * (imageHeight + labelHeight);
    const primary = await sharp(record.localFiles.exterior.path)
      .resize(cellWidth - 40, imageHeight - 20, { fit: "contain", background: "white" })
      .jpeg({ quality: 92 })
      .toBuffer();
    composites.push({ input: primary, left: left + 20, top: top + 10 });
    composites.push({
      input: Buffer.from(`<svg width="${cellWidth}" height="${labelHeight}">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="22" y="32" font-family="Arial, sans-serif" font-size="24" fill="#111827">${titleCase(record.model)}</text>
        <text x="22" y="58" font-family="Arial, sans-serif" font-size="18" fill="${record.eligibleForEdit ? "#047857" : "#b91c1c"}">${record.eligibleForEdit ? "ELIGIBLE PRIMARY" : "BLOCKED: primary reused"}</text>
      </svg>`),
      left,
      top: top + imageHeight,
    });
  }

  const rowsCount = Math.ceil(modelRecords.length / columns);
  const destination = path.join(sourceRoot, "exact-model-primary-source-evidence.jpg");
  await sharp({
    create: {
      width: columns * cellWidth,
      height: rowsCount * (imageHeight + labelHeight),
      channels: 3,
      background: "white",
    },
  })
    .composite(composites)
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(destination);
  return destination;
}

await mkdir(sourceRoot, { recursive: true });
const records = [];

for (const row of rows) {
  const htmlBytes = await fetchBytes(row.url);
  const html = htmlBytes.toString("utf8");
  if (!html.includes(`data-sku="${row.sku}"`)) {
    throw new Error(`Expected SKU ${row.sku} was not found at ${row.url}`);
  }
  const images = [...new Set(galleryUrls(html))];
  if (images.length !== 2) {
    throw new Error(`Expected exactly two product-gallery photos for ${row.sku}; found ${images.length}`);
  }

  const targetDir = path.join(sourceRoot, row.model, row.color);
  await mkdir(targetDir, { recursive: true });
  const localFiles = {};
  for (const [index, role] of ["exterior", "interior"].entries()) {
    const destination = path.join(targetDir, `${index + 1}-${role}.jpg`);
    let bytes;
    try {
      bytes = await readFile(destination);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      bytes = await fetchBytes(images[index]);
      await writeFile(destination, bytes);
    }
    const metadata = await sharp(bytes).metadata();
    localFiles[role] = {
      path: destination,
      relativePath: path.relative(reviewRoot, destination),
      bytes: bytes.length,
      sha256: sha256(bytes),
      width: metadata.width,
      height: metadata.height,
      sourceUrl: images[index],
    };
  }

  records.push({
    ...row,
    supplier: "PhoneLCDParts",
    constructionClaim: "Back Glass with Frame and MagSafe Magnet; no NFC or wireless charging flex named",
    localFiles,
  });
  console.log(`${row.model} ${row.color}: ${row.sku}`);
}

const modelInteriorHashes = new Map();
for (const record of records) {
  const hashes = modelInteriorHashes.get(record.model) ?? new Set();
  hashes.add(record.localFiles.interior.sha256);
  modelInteriorHashes.set(record.model, hashes);
}
const hashModels = new Map();
for (const record of records) {
  const models = hashModels.get(record.localFiles.interior.sha256) ?? new Set();
  models.add(record.model);
  hashModels.set(record.localFiles.interior.sha256, models);
}
const reusedInteriorHashes = new Map(
  [...hashModels].filter(([, models]) => models.size > 1),
);
const exteriorHashModels = new Map();
for (const record of records) {
  const models = exteriorHashModels.get(record.localFiles.exterior.sha256) ?? new Set();
  models.add(record.model);
  exteriorHashModels.set(record.localFiles.exterior.sha256, models);
}
const reusedExteriorHashes = new Map(
  [...exteriorHashModels].filter(([, models]) => models.size > 1),
);
const blockedByPrimaryReuse = new Set(
  [...reusedExteriorHashes.values()].flatMap((models) => [...models]),
);
for (const record of records) {
  const reusedAcrossModels = reusedInteriorHashes.get(record.localFiles.interior.sha256);
  const primaryReusedAcrossModels = reusedExteriorHashes.get(record.localFiles.exterior.sha256);
  record.crossModelInteriorReuse = reusedAcrossModels
    ? {
        detected: true,
        models: [...reusedAcrossModels].sort(),
        reason: "Supplier published this identical interior file under more than one model.",
      }
    : { detected: false, models: [] };
  record.primaryExteriorCrossModelReuse = primaryReusedAcrossModels
    ? {
        detected: true,
        models: [...primaryReusedAcrossModels].sort(),
        reason: "Supplier published this identical primary exterior/interior image under more than one model.",
      }
    : { detected: false, models: [] };
  record.externalExactModelCorroboration = externalExactModelCorroboration[record.model] ?? null;
  record.approvedSourceRole = "exterior";
  record.secondaryInteriorApprovedForEdit = !reusedAcrossModels;
  record.eligibleForEdit = !blockedByPrimaryReuse.has(record.model);
}

const evidenceSheet = await buildPrimaryEvidenceSheet(records);
const evidenceBytes = await readFile(evidenceSheet);
const manifest = {
  capturedAt: new Date().toISOString(),
  status: "source-evidence-only",
  supplier: "PhoneLCDParts",
  rules: {
    exactProductPageRequired: true,
    exactSkuVerified: true,
    aiGeneratedOrEdited: false,
    crossModelInteriorReuseAllowed: false,
    crossModelInteriorReuseDetected: reusedInteriorHashes.size > 0,
    crossModelPrimaryImageReuseAllowed: false,
    crossModelPrimaryImageReuseDetected: reusedExteriorHashes.size > 0,
    duplicatedSecondaryImageMayBeRetainedAsEvidenceButNeverEdited: true,
    chargingCoilIncluded: false,
    magnetsRetained: true,
    metallicHeatFilmVisualReviewRequired: true,
    shopifyUploadApproved: false,
  },
  blockedModels: [
    ...[...blockedByPrimaryReuse].sort().map((model) => ({
      model,
      reason:
        "PhoneLCDParts reused the identical primary product photo across this and another model. No replacement may be made from it.",
    })),
    {
      model: "iphone-air",
      reason:
        "No exact-model no-coil supplier page with exposed magnets and visible metallic heat film was found. Full-assembly photos are not accepted as substitutes.",
    },
  ],
  modelInteriorHashCounts: Object.fromEntries(
    [...modelInteriorHashes].map(([model, hashes]) => [model, hashes.size]),
  ),
  distinctInteriorHashCount: hashModels.size,
  crossModelReusedInteriorHashes: Object.fromEntries(
    [...reusedInteriorHashes].map(([hash, models]) => [hash, [...models].sort()]),
  ),
  crossModelReusedPrimaryExteriorHashes: Object.fromEntries(
    [...reusedExteriorHashes].map(([hash, models]) => [hash, [...models].sort()]),
  ),
  evidenceSheet: {
    relativePath: path.relative(reviewRoot, evidenceSheet),
    sha256: sha256(evidenceBytes),
  },
  records,
};

await writeFile(
  path.join(sourceRoot, "source-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(`Collected ${records.length} exact product pages across ${modelInteriorHashes.size} models.`);
