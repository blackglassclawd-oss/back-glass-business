import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const storefront = "https://backglasspros.com";
const outputDirectory = path.resolve("output/shopify-model-image-audit-2026-08-10");

interface ProductImage {
  src: string;
}

interface ProductVariant {
  featured_image: ProductImage | null;
  title: string;
}

interface Product {
  handle: string;
  id: number;
  images: ProductImage[];
  title: string;
  variants: ProductVariant[];
}

const models = [
  "17-pro-max",
  "17-pro",
  "17-air",
  "17",
  "16-pro-max",
  "16-pro",
  "16-plus",
  "16e",
  "16",
  "15-pro-max",
  "15-pro",
  "15-plus",
  "15",
  "14-pro-max",
  "14-pro",
  "14-plus",
  "14",
  "13-pro-max",
  "13-pro",
  "13-mini",
  "13",
  "12-pro-max",
  "12-pro",
  "12-mini",
  "12",
  "11-pro-max",
  "11-pro",
  "11",
  "xs-max",
  "xs",
  "xr",
  "x",
  "se-2nd-gen",
  "8-plus",
  "8",
] as const;

const filenameModelPatterns: Array<[string, RegExp]> = [
  ["17-pro-max", /(?:^|_)17_?pro_?max(?:_|$)/],
  ["17-pro", /(?:^|_)17_?pro(?:_|$)/],
  ["17-air", /(?:^|_)17_?air(?:_|$)/],
  ["17", /(?:^|_)17(?:_|$)/],
  ["16-pro-max", /(?:^|_)16_?pro_?max(?:_|$)/],
  ["16-pro", /(?:^|_)16_?pro(?:_|$)/],
  ["16-plus", /(?:^|_)16_?plus(?:_|$)/],
  ["16e", /(?:^|_)16e(?:_|$)/],
  ["16", /(?:^|_)16(?:_|$)/],
  ["15-pro-max", /(?:^|_)15_?pro_?max(?:_|$)/],
  ["15-pro", /(?:^|_)15_?pro(?:_|$)/],
  ["15-plus", /(?:^|_)15_?plus(?:_|$)/],
  ["15", /(?:^|_)15(?:_|$)/],
  ["14-pro-max", /(?:^|_)14_?pro_?max(?:_|$)/],
  ["14-pro", /(?:^|_)14_?pro(?:_|$)/],
  ["14-plus", /(?:^|_)14_?plus(?:_|$)/],
  ["14", /(?:^|_)14(?:_|$)/],
  ["13-pro-max", /(?:^|_)13_?pro_?max(?:_|$)/],
  ["13-pro", /(?:^|_)13_?pro(?:_|$)/],
  ["13-mini", /(?:^|_)13_?mini(?:_|$)/],
  ["13", /(?:^|_)13(?:_|$)/],
  ["12-pro-max", /(?:^|_)12_?pro_?max(?:_|$)/],
  ["12-pro", /(?:^|_)12_?pro(?:_|$)/],
  ["12-mini", /(?:^|_)12_?mini(?:_|$)/],
  ["12", /(?:^|_)12(?:_|$)/],
  ["11-pro-max", /(?:^|_)11_?pro_?max(?:_|$)/],
  ["11-pro", /(?:^|_)11_?pro(?:_|$)/],
  ["11", /(?:^|_)11(?:_|$)/],
  ["xs-max", /(?:^|_)xs_?max(?:_|$)/],
  ["xs", /(?:^|_)xs(?:_|$)/],
  ["xr", /(?:^|_)xr(?:_|$)/],
  ["se-2nd-gen", /(?:^|_)(?:se_?2|8_?se)(?:_|$)/],
  ["8-plus", /(?:^|_)8_?plus(?:_|$)/],
  ["8", /(?:^|_)8(?:_|$)/],
];

function basename(url: string) {
  return decodeURIComponent(new URL(url).pathname.split("/").at(-1) ?? url);
}

function expectedModel(handle: string) {
  return models.find((model) => handle.startsWith(`iphone-${model}-`)) ?? null;
}

function detectedFilenameModel(url: string) {
  const normalized = basename(url)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9]+/g, "_");
  return filenameModelPatterns.find(([, pattern]) => pattern.test(normalized))?.[0] ?? null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function variantAssignments(product: Product, image: ProductImage) {
  const target = basename(image.src);
  return product.variants
    .filter((variant) => variant.featured_image && basename(variant.featured_image.src) === target)
    .map((variant) => variant.title);
}

const response = await fetch(`${storefront}/products.json?limit=250&t=${Date.now()}`);
if (!response.ok) {
  throw new Error(`Storefront product export returned HTTP ${response.status}.`);
}

const payload = (await response.json()) as { products: Product[] };
const products = payload.products;
const flagged = products.flatMap((product) => {
  const expected = expectedModel(product.handle);
  return product.images.flatMap((image, index) => {
    const detected = detectedFilenameModel(image.src);
    return detected && expected && detected !== expected
      ? [{ detected, expected, image, index, product }]
      : [];
  });
});

const productMarkup = products
  .map((product) => {
    const expected = expectedModel(product.handle);
    const images = product.images
      .map((image, index) => {
        const detected = detectedFilenameModel(image.src);
        const mismatch = Boolean(detected && expected && detected !== expected);
        const assignments = variantAssignments(product, image);
        return `
          <figure class="media ${mismatch ? "mismatch" : ""}">
            <img src="${escapeHtml(image.src)}" alt="${escapeHtml(product.title)} image ${index + 1}">
            <figcaption>
              <strong>Image ${index + 1}${index === 0 ? " / featured" : ""}</strong>
              <span>${escapeHtml(basename(image.src))}</span>
              <span>Assigned: ${escapeHtml(assignments.join(", ") || "none")}</span>
              ${mismatch ? `<b>Filename model: ${escapeHtml(detected!)}; expected: ${escapeHtml(expected!)}</b>` : ""}
            </figcaption>
          </figure>`;
      })
      .join("");

    return `
      <section class="product" id="${escapeHtml(product.handle)}">
        <header>
          <h2>${escapeHtml(product.title)}</h2>
          <a href="${storefront}/products/${escapeHtml(product.handle)}">${escapeHtml(product.handle)}</a>
          <p>${product.variants.length} variants / ${product.images.length} images / expected model: ${escapeHtml(expected ?? "unknown")}</p>
        </header>
        <div class="gallery">${images}</div>
      </section>`;
  })
  .join("");

const overviewMarkup = products
  .map((product) => {
    const image = product.images[0];
    return `
      <figure class="overview-card">
        <img src="${escapeHtml(image.src)}" alt="${escapeHtml(product.title)} featured image">
        <figcaption>
          <strong>${escapeHtml(product.title)}</strong>
          <span>${escapeHtml(basename(image.src))}</span>
        </figcaption>
      </figure>`;
  })
  .join("");

const flaggedMarkup = flagged
  .map(({ detected, expected, image, index, product }) => `
    <figure class="media mismatch">
      <img src="${escapeHtml(image.src)}" alt="${escapeHtml(product.title)} flagged image ${index + 1}">
      <figcaption>
        <strong>${escapeHtml(product.title)} / image ${index + 1}</strong>
        <span>${escapeHtml(basename(image.src))}</span>
        <span>Assigned: ${escapeHtml(variantAssignments(product, image).join(", ") || "none")}</span>
        <b>Filename model: ${escapeHtml(detected)}; expected: ${escapeHtml(expected)}</b>
      </figcaption>
    </figure>`)
  .join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Back Glass Pros model/image audit - 2026-08-10</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; color: #171717; background: #f3f4f6; font: 14px/1.4 Arial, sans-serif; }
    main { width: min(1500px, 100%); margin: 0 auto; padding: 28px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .summary { margin: 0 0 28px; color: #555; }
    .product { margin: 0 0 24px; padding: 20px; background: #fff; border: 1px solid #d9dde3; }
    .product header { margin-bottom: 16px; }
    h2 { margin: 0 0 4px; font-size: 20px; }
    a { color: #0b57d0; }
    p { margin: 6px 0 0; color: #555; }
    .gallery { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
    .overview, .flagged { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin: 0 0 28px; }
    .overview-card { margin: 0; border: 1px solid #d8dde5; background: #fff; }
    .overview-card img { display: block; width: 100%; aspect-ratio: 4 / 5; object-fit: contain; background: white; }
    .section-title { margin: 30px 0 12px; font-size: 24px; }
    .media { margin: 0; border: 2px solid #d8dde5; background: #fafafa; }
    .media.mismatch { border-color: #c5221f; background: #fff1f0; }
    .media img { display: block; width: 100%; aspect-ratio: 4 / 5; object-fit: contain; background: white; }
    figcaption { display: grid; gap: 3px; padding: 9px; overflow-wrap: anywhere; font-size: 12px; }
    figcaption b { color: #a11916; }
    @media (max-width: 900px) { .gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  </style>
</head>
<body>
  <main>
    <h1>Back Glass Pros model/image audit</h1>
    <p class="summary">Captured ${new Date().toISOString()} from ${storefront}. ${products.length} active products, ${products.reduce((sum, product) => sum + product.images.length, 0)} product images, ${flagged.length} filename-model mismatches. This report is read-only.</p>
    <h2 class="section-title">Active product featured images</h2>
    <div class="overview">${overviewMarkup}</div>
    <h2 class="section-title">Filename-model mismatch evidence</h2>
    <div class="flagged">${flaggedMarkup}</div>
    <h2 class="section-title">Complete product galleries</h2>
    ${productMarkup}
  </main>
</body>
</html>`;

await mkdir(outputDirectory, { recursive: true });
const outputPath = path.join(outputDirectory, "index.html");
await writeFile(outputPath, html);
console.log(outputPath);
