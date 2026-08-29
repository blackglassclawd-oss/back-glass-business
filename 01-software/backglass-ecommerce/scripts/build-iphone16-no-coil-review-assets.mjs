import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

throw new Error(
  'Disabled: this workflow consumed disqualified generated images. Use only exact-model real supplier photos showing retained magnets, no charging coil, and visible metallic heat-dissipating film.',
);

const projectRoot = path.resolve(import.meta.dirname, '../../..');
const outputRoot = path.join(
  projectRoot,
  '02-assets/product-previews/iphone-16-series-half-assembly-no-coil/2026-08-13',
);
const stagingDir = process.env.IPHONE16_STAGING_DIR ?? path.join(outputRoot, 'revised-staging');
const imageDir = process.env.IPHONE16_IMAGE_DIR ?? path.join(outputRoot, 'images');
const reviewDir = process.env.IPHONE16_REVIEW_DIR ?? path.join(outputRoot, 'review');

const variants = [
  ['iphone-16', 'teal'],
  ['iphone-16', 'ultramarine'],
  ['iphone-16', 'pink'],
  ['iphone-16', 'black'],
  ['iphone-16', 'white'],
  ['iphone-16-plus', 'pink'],
  ['iphone-16-plus', 'ultramarine'],
  ['iphone-16-plus', 'teal'],
  ['iphone-16-plus', 'black'],
  ['iphone-16-plus', 'white'],
  ['iphone-16-pro', 'natural-titanium'],
  ['iphone-16-pro', 'desert-titanium'],
  ['iphone-16-pro', 'white-titanium'],
  ['iphone-16-pro', 'black-titanium'],
  ['iphone-16-pro-max', 'desert-titanium'],
  ['iphone-16-pro-max', 'natural-titanium'],
  ['iphone-16-pro-max', 'white-titanium'],
  ['iphone-16-pro-max', 'black-titanium'],
];

const titleCase = (value) =>
  value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const escapeXml = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

async function normalizeAsset(model, color) {
  const sourcePath = path.join(stagingDir, `${model}-${color}.png`);
  const outputPath = path.join(imageDir, `${model}-${color}.png`);
  await sharp(sourcePath)
    .resize(2000, 2500, { fit: 'fill' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);
  return outputPath;
}

async function buildContactSheet(model, rows) {
  const cellWidth = 500;
  const imageHeight = 625;
  const labelHeight = 58;
  const cellHeight = imageHeight + labelHeight;
  const columns = 2;
  const rowCount = Math.ceil(rows.length / columns);
  const width = cellWidth * columns;
  const height = cellHeight * rowCount;
  const composites = [];

  for (let index = 0; index < rows.length; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const { color, imagePath } = rows[index];
    const image = await sharp(imagePath)
      .resize(cellWidth, imageHeight, { fit: 'fill' })
      .png()
      .toBuffer();
    const label = Buffer.from(`
      <svg width="${cellWidth}" height="${labelHeight}">
        <rect width="100%" height="100%" fill="#f4f4f4"/>
        <text x="22" y="37" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#171717">${escapeXml(titleCase(color))}</text>
      </svg>
    `);
    composites.push({ input: image, left: column * cellWidth, top: row * cellHeight });
    composites.push({
      input: label,
      left: column * cellWidth,
      top: row * cellHeight + imageHeight,
    });
  }

  await sharp({
    create: { width, height, channels: 4, background: '#ffffff' },
  })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(reviewDir, `${model}-review-contact-sheet.png`));
}

await Promise.all([imageDir, reviewDir].map((dir) => fs.mkdir(dir, { recursive: true })));

const grouped = new Map();
for (const [model, color] of variants) {
  const imagePath = await normalizeAsset(model, color);
  const rows = grouped.get(model) ?? [];
  rows.push({ color, imagePath });
  grouped.set(model, rows);
}

for (const [model, rows] of grouped) {
  await buildContactSheet(model, rows);
}

console.log(`Built ${variants.length} unbadged images and ${grouped.size} contact sheets.`);
