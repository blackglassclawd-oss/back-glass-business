import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";
import { XMLParser } from "fast-xml-parser";

const STORE_DOMAIN =
  process.env.SHOPIFY_STORE_DOMAIN ?? "kfczyu-kc.myshopify.com";
const STORE_ORIGIN = `https://${STORE_DOMAIN}`;
const PRODUCT_PAGE_SIZE = 50;
const MAX_RETRIES = 6;
const args = new Set(process.argv.slice(2));
const publishCatalog = args.has("--publish-catalog");
const metadataOnly = args.has("--metadata-only");
const timestamp = new Date().toISOString().replaceAll(":", "-");
const snapshotDirectory = path.resolve("backups", "storefront", timestamp);
const assetsDirectory = path.join(snapshotDirectory, "assets");
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
});

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function asArray(value) {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeFileName(url, fallbackExtension = ".bin") {
  const parsed = new URL(url);
  const extension = path.extname(parsed.pathname).slice(0, 10);
  return `${sha256(url)}${extension || fallbackExtension}`;
}

function normalizeAssetUrl(url) {
  const parsed = new URL(url);
  for (const parameter of ["crop", "height", "width"]) {
    parsed.searchParams.delete(parameter);
  }
  return parsed.href;
}

function contentExtension(contentType) {
  const extensions = new Map([
    ["image/avif", ".avif"],
    ["image/gif", ".gif"],
    ["image/jpeg", ".jpg"],
    ["image/png", ".png"],
    ["image/svg+xml", ".svg"],
    ["image/webp", ".webp"],
    ["text/css", ".css"],
    ["text/javascript", ".js"],
  ]);
  return extensions.get(contentType?.split(";")[0]) ?? ".bin";
}

async function fetchWithRetry(url, options = {}) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          Accept: "*/*",
          "User-Agent": "BackGlassProsMigration/1.0",
          ...options.headers,
        },
      });
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      await sleep(Math.min(2_000 * 2 ** attempt, 30_000));
      continue;
    }

    if (response.ok) {
      return response;
    }

    const transientStatus =
      response.status === 408 ||
      response.status === 425 ||
      response.status === 429 ||
      (response.status >= 500 && response.status <= 504);
    if (!transientStatus || attempt === MAX_RETRIES) {
      throw new Error(`Request failed (${response.status}) for ${url}`);
    }

    const retryAfterSeconds = Number(response.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds * 1_000
      : Math.min(2_000 * 2 ** attempt, 30_000);
    await sleep(delay);
  }

  throw new Error(`Retry limit reached for ${url}`);
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function captureSitemaps() {
  const parentUrl = `${STORE_ORIGIN}/sitemap.xml`;
  const parentResponse = await fetchWithRetry(parentUrl);
  const parentXml = await parentResponse.text();
  await writeFile(path.join(snapshotDirectory, "sitemap.xml"), parentXml);

  const parent = xmlParser.parse(parentXml);
  const childUrls = asArray(parent.sitemapindex?.sitemap)
    .map((entry) => entry.loc)
    .filter(Boolean);
  const routes = [];
  const imageUrls = new Set();

  for (const [index, childUrl] of childUrls.entries()) {
    const response = await fetchWithRetry(childUrl);
    const xml = await response.text();
    await writeFile(
      path.join(snapshotDirectory, "sitemaps", `${index + 1}.xml`),
      xml,
    );
    const parsed = xmlParser.parse(xml);

    for (const entry of asArray(parsed.urlset?.url)) {
      if (!entry.loc) {
        continue;
      }
      routes.push({
        lastModified: entry.lastmod ?? null,
        url: entry.loc,
      });
      for (const image of asArray(entry.image)) {
        if (image?.loc) {
          imageUrls.add(normalizeAssetUrl(image.loc));
        }
      }
    }
    await sleep(750);
  }

  return { childUrls, imageUrls, routes };
}

async function captureProducts() {
  const products = [];

  for (let pageNumber = 1; ; pageNumber += 1) {
    const url = new URL("/products.json", STORE_ORIGIN);
    url.searchParams.set("limit", String(PRODUCT_PAGE_SIZE));
    url.searchParams.set("page", String(pageNumber));
    const response = await fetchWithRetry(url);
    const page = await response.json();
    const pageProducts = asArray(page.products);
    products.push(...pageProducts);

    process.stdout.write(
      `Catalog page ${pageNumber}: ${pageProducts.length} products\n`,
    );
    if (pageProducts.length < PRODUCT_PAGE_SIZE) {
      break;
    }
    await sleep(1_000);
  }

  return products;
}

function routeFileName(url) {
  const parsed = new URL(url);
  const routeName =
    parsed.pathname === "/"
      ? "index"
      : parsed.pathname.replace(/^\/|\/$/g, "").replaceAll("/", "__");
  return `${routeName || "index"}-${sha256(url).slice(0, 10)}.html`;
}

function collectHtmlAssets(html, pageUrl) {
  const $ = load(html);
  const urls = new Set();

  for (const [selector, attribute] of [
    ["img[src]", "src"],
    ["link[rel='stylesheet'][href]", "href"],
    ["script[src]", "src"],
    ["source[src]", "src"],
  ]) {
    $(selector).each((_, element) => {
      const rawUrl = $(element).attr(attribute);
      if (rawUrl) {
        urls.add(normalizeAssetUrl(new URL(rawUrl, pageUrl).href));
      }
    });
  }

  $("[srcset]").each((_, element) => {
    const srcset = $(element).attr("srcset") ?? "";
    for (const candidate of srcset.split(",")) {
      const rawUrl = candidate.trim().split(/\s+/)[0];
      if (rawUrl) {
        urls.add(normalizeAssetUrl(new URL(rawUrl, pageUrl).href));
      }
    }
  });

  return [...urls].filter((url) => {
    const parsed = new URL(url);
    const isShopifyCdn = parsed.hostname === "cdn.shopify.com";
    const isStoreAsset =
      parsed.hostname === STORE_DOMAIN && parsed.pathname.startsWith("/cdn/");
    const isThirdPartyExtension =
      parsed.pathname.includes("/extensions/") ||
      parsed.pathname.includes("/shopifycloud/") ||
      parsed.pathname.includes("/wpm/");
    return (isShopifyCdn || isStoreAsset) && !isThirdPartyExtension;
  });
}

async function capturePages(routes) {
  const pages = [];
  const assetUrls = new Set();
  const prioritizedRoutes = [
    { lastModified: null, url: `${STORE_ORIGIN}/` },
    ...routes,
  ];
  const uniqueRoutes = [
    ...new Map(prioritizedRoutes.map((route) => [route.url, route])).values(),
  ];

  for (const [index, route] of uniqueRoutes.entries()) {
    try {
      const response = await fetchWithRetry(route.url, {
        headers: { Accept: "text/html" },
      });
      const html = await response.text();
      const fileName = routeFileName(route.url);
      await writeFile(path.join(snapshotDirectory, "pages", fileName), html);
      const discoveredAssets = collectHtmlAssets(html, route.url);
      discoveredAssets.forEach((url) => assetUrls.add(url));
      pages.push({
        assetCount: discoveredAssets.length,
        file: `pages/${fileName}`,
        lastModified: route.lastModified,
        status: response.status,
        url: route.url,
      });
    } catch (error) {
      pages.push({
        error: error instanceof Error ? error.message : String(error),
        lastModified: route.lastModified,
        url: route.url,
      });
    }
    process.stdout.write(
      `Page ${index + 1}/${uniqueRoutes.length}: ${route.url}\n`,
    );
    await sleep(300);
  }

  return { assetUrls, pages };
}

async function downloadAssets(urls) {
  await mkdir(assetsDirectory, { recursive: true });
  const queue = [...urls];
  const results = [];

  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift();
      try {
        const response = await fetchWithRetry(url);
        const bytes = Buffer.from(await response.arrayBuffer());
        const extension = contentExtension(response.headers.get("content-type"));
        const fileName = safeFileName(url, extension);
        await writeFile(path.join(assetsDirectory, fileName), bytes);
        results.push({
          bytes: bytes.length,
          contentType: response.headers.get("content-type"),
          file: `assets/${fileName}`,
          sha256: sha256(bytes),
          url,
        });
      } catch (error) {
        results.push({
          error: error instanceof Error ? error.message : String(error),
          url,
        });
      }
    }
  }

  await Promise.all(Array.from({ length: 4 }, () => worker()));
  return results.sort((left, right) => left.url.localeCompare(right.url));
}

await mkdir(path.join(snapshotDirectory, "pages"), { recursive: true });
await mkdir(path.join(snapshotDirectory, "sitemaps"), { recursive: true });

const startedAt = new Date().toISOString();
const sitemap = await captureSitemaps();
const products = await captureProducts();
const pageCapture = await capturePages(sitemap.routes);
const assetUrls = new Set([...sitemap.imageUrls, ...pageCapture.assetUrls]);

for (const product of products) {
  for (const image of asArray(product.images)) {
    if (image?.src) {
      assetUrls.add(normalizeAssetUrl(image.src));
    }
  }
}

const assets = metadataOnly ? [] : await downloadAssets(assetUrls);
const completedAt = new Date().toISOString();
const catalog = {
  capturedAt: completedAt,
  currency: "USD",
  products,
  source: STORE_ORIGIN,
};
const manifest = {
  assets,
  capturedAt: completedAt,
  counts: {
    assetsDiscovered: assetUrls.size,
    assetsDownloaded: assets.filter((asset) => !asset.error).length,
    assetFailures: assets.filter((asset) => asset.error).length,
    products: products.length,
    routes: pageCapture.pages.length,
    routeFailures: pageCapture.pages.filter((page) => page.error).length,
    variants: products.reduce(
      (total, product) => total + asArray(product.variants).length,
      0,
    ),
  },
  pages: pageCapture.pages,
  sitemaps: sitemap.childUrls,
  source: STORE_ORIGIN,
  startedAt,
};

await writeJson(path.join(snapshotDirectory, "catalog.json"), catalog);
await writeJson(path.join(snapshotDirectory, "manifest.json"), manifest);

if (publishCatalog) {
  await writeJson(path.resolve("data", "storefront", "catalog.json"), catalog);
  await writeJson(
    path.resolve("data", "storefront", "snapshot-summary.json"),
    {
      capturedAt: completedAt,
      counts: manifest.counts,
      source: STORE_ORIGIN,
    },
  );
}

process.stdout.write(
  `${JSON.stringify(
    {
      counts: manifest.counts,
      publishedCatalog: publishCatalog,
      snapshotDirectory,
    },
    null,
    2,
  )}\n`,
);

if (manifest.counts.assetFailures > 0 || manifest.counts.routeFailures > 0) {
  process.exitCode = 1;
}
