import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

throw new Error(
  "Disabled for iPhone 17 no-coil media: the former inputs were generated and model-specific construction was not evidenced. Use exact-model real supplier photos only.",
);

const projectRoot = path.resolve(import.meta.dirname, "../../..");
const iphone17Root = path.join(
  projectRoot,
  "02-assets/product-previews/iphone-17-series-half-assembly-no-coil/2026-08-14",
);
const coilSourceRoot = path.join(
  projectRoot,
  "02-assets/product-previews/nfc-charging-coils/2026-08-09/supplier-preview-only",
);
const coilRoot = path.join(
  projectRoot,
  "02-assets/product-previews/nfc-charging-coils/2026-08-14",
);

const iphone17Variants = {
  "iphone-17": ["black", "white", "mist-blue", "lavender", "sage"],
  "iphone-17-pro": ["deep-blue", "silver", "cosmic-orange"],
  "iphone-17-pro-max": ["deep-blue", "silver", "cosmic-orange"],
  "iphone-air": ["space-black", "cloud-white", "light-gold", "sky-blue"],
};

const coilSources = {
  "iphone-14": "mobilesentrix-14.png",
  "iphone-14-plus": "mobilesentrix-14-plus.webp",
  "iphone-15": "mobilesentrix-15.webp",
  "iphone-15-plus": "mobilesentrix-15-plus.webp",
  "iphone-15-pro": "mobilesentrix-15-pro.webp",
  "iphone-15-pro-max": "mobilesentrix-15-pro-max.webp",
  "iphone-16": "mobilesentrix-16.webp",
  "iphone-16-plus": "mobilesentrix-16-plus.webp",
  "iphone-16-pro": "mobilesentrix-16-pro.webp",
  "iphone-16-pro-max": "mobilesentrix-16-pro-max.webp",
  "iphone-17": "mobilesentrix-17.webp",
  "iphone-air": "mobilesentrix-17-air.webp",
  "iphone-17-pro": "mobilesentrix-17-pro.webp",
  "iphone-17-pro-max": "mobilesentrix-17-pro-max.webp",
};

const titleCase = (value) =>
  value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

const escapeXml = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

async function contactSheet(rows, destination, columns = 2) {
  const cellWidth = 500;
  const imageHeight = 625;
  const labelHeight = 62;
  const cellHeight = imageHeight + labelHeight;
  const composites = [];
  for (const [index, row] of rows.entries()) {
    const left = (index % columns) * cellWidth;
    const top = Math.floor(index / columns) * cellHeight;
    composites.push({
      input: await sharp(row.file).resize(cellWidth, imageHeight, { fit: "contain", background: "white" }).png().toBuffer(),
      left,
      top,
    });
    composites.push({
      input: Buffer.from(`<svg width="${cellWidth}" height="${labelHeight}">
        <rect width="100%" height="100%" fill="#f4f4f4"/>
        <text x="20" y="39" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#171717">${escapeXml(row.label)}</text>
      </svg>`),
      left,
      top: top + imageHeight,
    });
  }
  const rowCount = Math.ceil(rows.length / columns);
  await sharp({ create: { width: columns * cellWidth, height: rowCount * cellHeight, channels: 3, background: "white" } })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(destination);
}

async function buildIphone17Assets() {
  const imageDir = path.join(iphone17Root, "images");
  const reviewDir = path.join(iphone17Root, "review");
  await fs.mkdir(reviewDir, { recursive: true });
  const allRows = [];
  for (const [model, colors] of Object.entries(iphone17Variants)) {
    const modelRows = [];
    for (const color of colors) {
      const file = path.join(imageDir, `${model}-${color}.png`);
      const normalized = `${file}.normalized.png`;
      await sharp(file).resize(2000, 2500, { fit: "fill" }).png({ compressionLevel: 9 }).toFile(normalized);
      await fs.rename(normalized, file);
      const row = { file, label: titleCase(color) };
      modelRows.push(row);
      allRows.push({ file, label: `${titleCase(model)} - ${titleCase(color)}` });
    }
    await contactSheet(modelRows, path.join(reviewDir, `${model}-contact-sheet.png`));
  }
  await contactSheet(allRows, path.join(reviewDir, "all-iphone-17-series-contact-sheet.png"), 3);
}

async function buildCoilAssets() {
  const imageDir = path.join(coilRoot, "images");
  const reviewDir = path.join(coilRoot, "review");
  await Promise.all([imageDir, reviewDir].map((dir) => fs.mkdir(dir, { recursive: true })));
  const rows = [];
  for (const [model, sourceName] of Object.entries(coilSources)) {
    const source = path.join(coilSourceRoot, sourceName);
    const destination = path.join(imageDir, `${model}-wireless-nfc-charging-flex.png`);
    await sharp(source)
      .trim({ background: "white", threshold: 8 })
      .resize(1640, 2050, { fit: "contain", background: "white", withoutEnlargement: false })
      .extend({
        top: 225,
        bottom: 225,
        left: 180,
        right: 180,
        background: "white",
      })
      .png({ compressionLevel: 9 })
      .toFile(destination);
    rows.push({ file: destination, label: titleCase(model) });
  }
  await contactSheet(rows, path.join(reviewDir, "michael-carried-models-coil-contact-sheet.png"), 3);
}

await buildIphone17Assets();
await buildCoilAssets();
console.log("Built 15 iPhone 17/Air no-coil review assets and 14 model-specific coil review assets.");
